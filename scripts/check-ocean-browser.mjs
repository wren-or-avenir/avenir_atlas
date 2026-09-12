// Local Chrome started with --headless=new --remote-debugging-port=9223.
// node scripts/check-ocean-browser.mjs day C:/path/to/output.png
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const [mode = 'day', output, seconds = '8', motion, dpr = '1', take = 'natural'] = process.argv.slice(2);
const recordMotion=motion==='motion'||motion==='clip';
assert.ok(mode === 'day' || mode === 'night');
const pages = await (await fetch('http://localhost:9223/json/list')).json();
const socket = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let id = 0;
const pending = new Map();
const errors = [];
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) {
    const promise = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) promise.reject(new Error(JSON.stringify(message.error)));
    else promise.resolve(message.result);
  } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
  else if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry);
};
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
const timeout=setTimeout(()=>{console.error('Browser check timed out');process.exit(1);},75000);
try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Log.enable');
  if(motion==='perf') await send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{
    const raf=window.requestAnimationFrame.bind(window);
    window.oceanGpuTimes=[];
    let gl,ext;const pending=[];
    window.requestAnimationFrame=callback=>raf(now=>{
      gl??=document.querySelector('#stage canvas')?.getContext('webgl2');
      if(!gl||gl.isContextLost()){callback(now);return;}
      ext??=gl.getExtension('EXT_disjoint_timer_query_webgl2');
      if(!ext){callback(now);return;}
      const disjoint=gl.getParameter(ext.GPU_DISJOINT_EXT);
      for(let i=pending.length-1;i>=0;i--){
        const q=pending[i];
        if(disjoint||gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)){
          if(!disjoint)window.oceanGpuTimes.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);
          gl.deleteQuery(q);pending.splice(i,1);
        }
      }
      const before=gl.canvas.dataset.stageFrame;
      const q=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,q);
      try{callback(now);}finally{
        gl.endQuery(ext.TIME_ELAPSED_EXT);
        if(gl.canvas.dataset.stageFrame!==before)pending.push(q);else gl.deleteQuery(q);
      }
    });
  })()`});
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: Number(dpr), mobile: false });
  await send('Page.navigate', { url: 'http://localhost:4321/?ocean=' + mode + '&take=' + encodeURIComponent(take) });
  await new Promise(resolve => setTimeout(resolve, Number(seconds)*1000));
  const check=await send('Runtime.evaluate',{expression:`JSON.stringify({canvas:!!document.querySelector('canvas'),shaderError:document.querySelector('#stage pre')?.textContent,mode:document.body.dataset.daynight})`,returnByValue:true});
  const state=JSON.parse(check.result.value);
  console.log(JSON.stringify({state,errors}));
  assert.ok(state.canvas,'Canvas missing');
  assert.ok(!state.shaderError,'Shader compilation failed: '+state.shaderError);
  assert.equal(state.mode,mode);
  assert.equal(errors.length,0,'Browser errors');
  if(motion==='perf') {
    const measured=await send('Runtime.evaluate',{awaitPromise:true,returnByValue:true,expression:`new Promise(resolve=>{
      const canvas=document.querySelector('canvas'), gl=canvas.getContext('webgl2');
      const info=gl.getExtension('WEBGL_debug_renderer_info');
      window.oceanGpuTimes.length=0;
      const frames=[];let previous=performance.now(),start=previous,lastClock=-1,repeats=0,lastFrame=-1,callbacks=0;
      function sample(now){
        callbacks++;
        const frame=Number(canvas.dataset.stageFrame??callbacks);
        if(frame!==lastFrame){
          frames.push(now-previous);previous=now;lastFrame=frame;
          const clock=Number(canvas.dataset.oceanTime);if(clock===lastClock)repeats++;lastClock=clock;
        }
        if(now-start<8000){requestAnimationFrame(sample);return;}
        frames.sort((a,b)=>a-b);
        const gpuTimes=window.oceanGpuTimes.toSorted((a,b)=>a-b);
        resolve({gpu:info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):'unavailable',
          width:canvas.width,height:canvas.height,dpr:devicePixelRatio,frames:frames.length,
          fps:frames.length*1000/(now-start),callbackFps:callbacks*1000/(now-start),medianMs:frames[Math.floor(frames.length*.5)],
          p95Ms:frames[Math.floor(frames.length*.95)],repeatedClockFrames:repeats,
          gpuSamples:gpuTimes.length,gpuMedianMs:gpuTimes[Math.floor(gpuTimes.length*.5)]??null,
          gpuP95Ms:gpuTimes[Math.floor(gpuTimes.length*.95)]??null});
      }requestAnimationFrame(sample);
    })`});
    console.log(JSON.stringify({performance:measured.result.value}));
    assert.equal(measured.result.value.repeatedClockFrames,0,'Each rendered frame must advance the visible wave clock');
    assert.ok(measured.result.value.fps<=61,'Background rendering must stay within the 60 FPS budget');
    assert.ok(measured.result.value.width*measured.result.value.height<=1600*1000,'Canvas must respect the background pixel budget');
    if(output) await writeFile(output.replace(/\.png$/,'.json'),JSON.stringify(measured.result.value,null,2));
  }
  await send('Runtime.evaluate',{expression:`document.querySelectorAll('.lil-gui,astro-dev-toolbar').forEach(e=>e.style.display='none')`});
  if(output) {
    const shot=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(output,Buffer.from(shot.data,'base64'));
    console.log(output);
  }
  const evaluate=async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true})).result.value;
  if(recordMotion&&output) await evaluate(`(()=>{
    const stream=document.querySelector('canvas').captureStream(30);
    window.oceanRecording={stream,chunks:[],recorder:new MediaRecorder(stream,{mimeType:'video/webm',videoBitsPerSecond:12000000})};
    const recording=window.oceanRecording;
    recording.recorder.ondataavailable=e=>recording.chunks.push(e.data);
    recording.recorder.start();
  })()`);
  const clock=()=>evaluate(`Number(document.querySelector('canvas').dataset.oceanTime)`);
  let last=await clock();
  const samples=[last];
  for(let i=0;i<(motion==='clip'?5:motion==='motion'?6:1);i++) {
    await new Promise(resolve=>setTimeout(resolve,motion==='clip'?4000:motion==='motion'?8000:1000));
    const current=await clock();
    assert.ok(current>last,'Ocean simulation did not advance');
    samples.push(current);last=current;
    if(recordMotion&&output) {
      const shot=await send('Page.captureScreenshot',{format:'png'});
      await writeFile(output.replace(/\.png$/, '-'+(i+1)+'.png'),Buffer.from(shot.data,'base64'));
    }
  }
  if(recordMotion&&output) {
    const recording=await send('Runtime.evaluate',{expression:`new Promise(resolve=>{
      const recording=window.oceanRecording;
      recording.recorder.onstop=()=>{
        recording.stream.getTracks().forEach(track=>track.stop());
        const reader=new FileReader();
        reader.onload=()=>{resolve(reader.result);delete window.oceanRecording;};
        reader.readAsDataURL(new Blob(recording.chunks,{type:'video/webm'}));
      };
      recording.recorder.stop();
    })`,awaitPromise:true,returnByValue:true});
    await writeFile(output.replace(/\.png$/,'.webm'),Buffer.from(recording.result.value.split(',')[1],'base64'));
  }
  await evaluate(`document.querySelector('.lil-gui input[type=checkbox]').click()`);
  const frozen=await clock();
  await new Promise(resolve=>setTimeout(resolve,250));
  assert.equal(await clock(),frozen,'Pause must freeze both waves and foam');
  await evaluate(`Array.from(document.querySelectorAll('.lil-gui button')).find(e=>e.textContent.trim()==='reset').click()`);
  await new Promise(resolve=>setTimeout(resolve,250));
  assert.equal(await clock(),0,'Reset must clear the simulation clock while paused');
  for(const [width,height] of [[2560,1440],[1024,768]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:false});
    await new Promise(resolve=>setTimeout(resolve,250));
    assert.ok(!await evaluate(`document.querySelector('#stage pre')?.textContent`),'Shader error after resize');
    assert.equal(await clock(),0,'Resize should preserve paused clock');
    assert.ok(await evaluate(`(()=>{const c=document.querySelector('canvas');return c.width*c.height<=1600*1000;})()`),'Resize must preserve the pixel budget');
  }
  const lost=await evaluate(`(()=>{const gl=document.querySelector('canvas').getContext('webgl2');const ext=gl.getExtension('WEBGL_lose_context');if(!ext)return false;ext.loseContext();return true;})()`);
  await new Promise(resolve=>setTimeout(resolve,250));
  if(lost) assert.equal(await evaluate(`!!document.querySelector('#stage canvas')`),false,'Context loss should reveal CSS fallback');
  const field=await readFile(new URL('../src/components/ocean/shaders/field.glsl',import.meta.url),'utf8');
  const noiseCheck=await evaluate(String.raw`(()=>{
    const gl=new OffscreenCanvas(64,64).getContext('webgl2');
    const program=gl.createProgram(),shaders=[];
    try {
      const vertex='#version 300 es\nvoid main(){gl_Position=vec4(vec2((gl_VertexID<<1)&2,gl_VertexID&2)*2.0-1.0,0,1);}';
      const fragment='#version 300 es\nprecision highp float;\nprecision highp int;\n#define texture2D texture\n'+${JSON.stringify(field)}+
        '\nout vec4 color;void main(){vec2 p=floor(gl_FragCoord.xy/4.0)-8.0+mix(vec2(0.3),vec2(0.999),mod(floor(gl_FragCoord.xy),4.0)/3.0);float n=noise(p);vec3 expected=vec3(n,(vec2(noise(p+vec2(0.025,0)),noise(p+vec2(0,0.025)))-n)/0.025);color=vec4(any(greaterThan(abs(noiseSlope(p)-expected),vec3(0.0001)))?1.0:0.0,0,0,1);}';
      for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
        const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);
        if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))return gl.getShaderInfoLog(shader);
        gl.attachShader(program,shader);
      }
      gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return gl.getProgramInfoLog(program);
      gl.useProgram(program);gl.drawArrays(gl.TRIANGLES,0,3);
      const pixels=new Uint8Array(64*64*4);gl.readPixels(0,0,64,64,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      if(gl.getError()!==gl.NO_ERROR)return 'WebGL noise check failed';
      return pixels.every((value,index)=>index%4!==0||value===0)?'passed':'Noise slope changed at a lattice boundary';
    } finally {shaders.forEach(shader=>gl.deleteShader(shader));gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();}
  })()`);
  assert.equal(noiseCheck,'passed');
  assert.equal(errors.length,0,'Browser errors after motion/resize');
  console.log(JSON.stringify({simulationSeconds:samples,pauseAndReset:'passed',resize:'passed',noiseSlope:noiseCheck,contextLoss:lost?'passed':'extension unavailable'}));
} finally { clearTimeout(timeout);socket.close(); }
