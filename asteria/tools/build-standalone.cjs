/* Build an offline single-file HTML without changing the modular source. */
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace('<!doctype html>','<!doctype html>\n<!-- Bundled Three.js MIT license\n'+fs.readFileSync(path.join(root,'vendor/THREE-LICENSE.txt'),'utf8')+'\n-->');
html=html.replace(/<link rel="stylesheet" href="([^\"]+\.css)">/g,(_,src)=>'<style>\n'+fs.readFileSync(path.join(root,src),'utf8')+'\n</style>');
html=html.replace(/<script defer src="([^"]+)"><\/script>/g,(_,src)=>'<script defer>\n'+fs.readFileSync(path.join(root,src),'utf8').replace(/<\/script/gi,'<\\/script')+'\n</script>');
// Inline classic scripts execute after the DOM is parsed, preserving source order.
const scripts=[];html=html.replace(/<script defer>[\s\S]*?<\/script>/g,s=>{scripts.push(s.replace('<script defer>','<script>'));return '';});
html=html.replace('</body>',()=>scripts.join('\n')+'\n</body>');
const out=path.resolve(root,'..','사라진-천문학자의-관측소.html');
fs.writeFileSync(out,html);

console.log('Standalone HTML: '+out+' ('+Buffer.byteLength(html)+' bytes)');
