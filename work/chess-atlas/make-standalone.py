from pathlib import Path
import base64,json,re,sys
root=Path('dist')
map_names={
 'three':('vendor/three.module.js',{}),
 'orbit-controls':('vendor/OrbitControls.js',{}),
 'chess-rules':('vendor/chess.js',{}),
 'chess-model':('model.js',{'./vendor/chess.js':'chess-rules'}),
 'chess-motion':('motion.js',{}),
 'chess-playback':('playback.js',{}),
 'chess-scene':('scene.js',{'./vendor/OrbitControls.js':'orbit-controls','./motion.js':'chess-motion','./playback.js':'chess-playback'})
}
imports={}
for name,(file,replace) in map_names.items():
 text=(root/file).read_text()
 for before,after in replace.items():text=text.replace("'"+before+"'","'"+after+"'")
 imports[name]='data:text/javascript;base64,'+base64.b64encode(text.encode()).decode()
html=(root/'index.html').read_text()
html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+(root/'style.css').read_text()+'</style>')
html=re.sub(r'<script type="importmap">.*?</script>','<script type="importmap">'+json.dumps({'imports':imports})+'</script>',html)
app=(root/'app.js').read_text().replace("'./model.js'","'chess-model'").replace("'./scene.js'","'chess-scene'").replace("'./playback.js'","'chess-playback'")
html=html.replace('<script type="module" src="app.js"></script>','<script type="module">'+app+'</script>')
html=html.replace('href="./"', 'href="#"')
output=Path(sys.argv[1]) if len(sys.argv)>1 else Path('chess-atlas.html')
output.write_text(html)
