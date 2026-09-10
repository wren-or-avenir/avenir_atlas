// Local Chrome started with --headless=new --remote-debugging-port=9223.
// node scripts/check-ocean-browser.mjs day C:/path/to/output.png
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const [mode = 'day', output, seconds = '8', motion] = process.argv.slice(2);
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
const timeout=setTimeout(()=>{console.error('Browser check timed out');process.exit(1);},55000);
try {
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:4321/?ocean=' + mode });
  await new Promise(resolve => setTimeout(resolve, Number(seconds)*1000));
  const check=await send('Runtime.evaluate',{expression:`JSON.stringify({canvas:!!document.querySelector('canvas'),shaderError:document.querySelector('#stage pre')?.textContent,mode:document.body.dataset.daynight})`,returnByValue:true});
  const state=JSON.parse(check.result.value);
  console.log(JSON.stringify({state,errors}));
  assert.ok(state.canvas,'Canvas missing');
  assert.ok(!state.shaderError,'Shader compilation failed: '+state.shaderError);
  assert.equal(state.mode,mode);
  assert.equal(errors.length,0,'Browser errors');
  await send('Runtime.evaluate',{expression:`document.querySelectorAll('.lil-gui,astro-dev-toolbar').forEach(e=>e.style.display='none')`});
  if(output) {
    const shot=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(output,Buffer.from(shot.data,'base64'));
    console.log(output);
  }
  const evaluate=async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true})).result.value;
  const clock=()=>evaluate(`Number(document.querySelector('canvas').dataset.oceanTime)`);
  let last=await clock();
  const samples=[last];
  for(let i=0;i<(motion==='motion'?3:1);i++) {
    await new Promise(resolve=>setTimeout(resolve,motion==='motion'?8000:1000));
    const current=await clock();
    assert.ok(current>last,'Ocean simulation did not advance');
    samples.push(current);last=current;
    if(motion==='motion'&&output) {
      const shot=await send('Page.captureScreenshot',{format:'png'});
      await writeFile(output.replace(/\.png$/, '-'+(i+1)+'.png'),Buffer.from(shot.data,'base64'));
    }
  }
  await evaluate(`document.querySelector('.lil-gui input[type=checkbox]').click()`);
  const frozen=await clock();
  await new Promise(resolve=>setTimeout(resolve,250));
  assert.equal(await clock(),frozen,'Pause must freeze both waves and foam');
  await evaluate(`Array.from(document.querySelectorAll('.lil-gui button')).find(e=>e.textContent.trim()==='reset').click()`);
  await new Promise(resolve=>setTimeout(resolve,250));
  assert.equal(await clock(),0,'Reset must clear the simulation clock while paused');
  await send('Emulation.setDeviceMetricsOverride',{width:1024,height:768,deviceScaleFactor:2,mobile:false});
  await new Promise(resolve=>setTimeout(resolve,250));
  assert.ok(!await evaluate(`document.querySelector('#stage pre')?.textContent`),'Shader error after resize');
  assert.equal(await clock(),0,'Resize should preserve paused clock');
  const lost=await evaluate(`(()=>{const gl=document.querySelector('canvas').getContext('webgl2');const ext=gl.getExtension('WEBGL_lose_context');if(!ext)return false;ext.loseContext();return true;})()`);
  await new Promise(resolve=>setTimeout(resolve,250));
  if(lost) assert.equal(await evaluate(`!!document.querySelector('#stage canvas')`),false,'Context loss should reveal CSS fallback');
  assert.equal(errors.length,0,'Browser errors after motion/resize');
  console.log(JSON.stringify({simulationSeconds:samples,pauseAndReset:'passed',resize:'passed',contextLoss:lost?'passed':'extension unavailable'}));
} finally { clearTimeout(timeout);socket.close(); }
