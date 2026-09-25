const {test}=require('node:test');
const assert=require('node:assert/strict');
const media=require('../src/rubik-seo-geo-media.js');

const base=()=>({
  brand:{name:'Casa'},
  dishes:[{id:'dish-1',name:'Gamba roja',origin:'Santa Pola',image:'https://cdn.example.test/menu/gamba-original.jpg',enabled:true}],
  media:{hero:{type:'image',name:'hero.jpg',loading:'lazy',width:1920,height:1080,url:'https://cdn.example.test/hero.jpg'}},
  seo:{site:{baseUrl:'https://casa.example.test/'},media:{}}
});

test('B1 converges productive dish image source and derives URL basename without destroying source URL',()=>{
  const c=base(),a=media.project(c,'dish-1','2026-01-01T00:00:00.000Z');
  assert.equal(a.originalName,'gamba-original.jpg');
  assert.equal(a.sourceUrl,'https://cdn.example.test/menu/gamba-original.jpg');
  assert.equal(a.seoFilename.value,'gamba-roja-santa-pola');
  assert.equal(a.alt.value,'Gamba roja');
  assert.equal(a.caption.value,'Gamba roja · Santa Pola');
  assert.deepEqual(a.alt.derivedFrom,['dishes.dish-1.name']);
  assert.deepEqual(a.seoFilename.derivedFrom,['dishes.dish-1.name','dishes.dish-1.origin']);
});

test('B1 AUTO recalculates with updatedAt, CUSTOM survives source changes, reset returns to AUTO',()=>{
  const c=base(),t1='2026-01-01T00:00:00.000Z',t2='2026-01-02T00:00:00.000Z';
  let a=media.project(c,'dish-1',t1);c.seo.media['dish-1']={alt:a.alt,seoFilename:a.seoFilename};
  c.dishes[0].name='Gamba roja de Santa Pola';
  a=media.project(c,'dish-1',t2);assert.equal(a.alt.value,'Gamba roja de Santa Pola');assert.equal(a.alt.updatedAt,t2);
  c.seo.media['dish-1'].alt={mode:'custom',value:'Plato de gamba roja en vajilla blanca',updatedAt:'custom-time'};
  c.dishes[0].name='Otro nombre';a=media.project(c,'dish-1','2026-01-03T00:00:00.000Z');assert.equal(a.alt.value,'Plato de gamba roja en vajilla blanca');assert.equal(a.alt.updatedAt,'custom-time');
  c.seo.media['dish-1']=media.resetField(c,'dish-1','alt');a=media.project(c,'dish-1','2026-01-04T00:00:00.000Z');assert.equal(a.alt.mode,'auto');assert.equal(a.alt.value,'Otro nombre');
});

test('decorative media forces published ALT empty and unknown context never hallucinates',()=>{
  const c=base();c.media.hero.decorative=true;c.seo.media.hero={alt:{mode:'custom',value:'No debe publicarse'}};
  const a=media.project(c,'hero');assert.equal(a.alt.value,'');assert.equal(a.alt.mode,'auto');
  assert.ok(media.audit(c).some(x=>x.id==='media.hero.decorative-alt'));
  const unknown={media:{x:{type:'image',name:'IMG_0001.jpg'}},seo:{media:{}}};assert.equal(media.project(unknown,'x').alt.value,'');
});

test('audit covers dish-only assets plus filename dimensions format weight LCP and stable URL warnings',()=>{
  const c=base();c.dishes[0].image='local-dish.jpg';c.media.hero={type:'image',name:'hero.bmp',format:'bmp',size:900000,loading:'lazy',pageRefs:['home']};
  const ids=new Set(media.audit(c).map(x=>x.id));
  assert.ok(ids.has('media.dish-1.dimensions'),'dish[] image participates in audit');
  assert.ok(!ids.has('media.hero.filename'),'semantic AUTO filename replaces physical/UUID naming');
  assert.ok(ids.has('media.hero.format'));
  assert.ok(ids.has('media.hero.weight'));
  assert.ok(ids.has('media.hero.lcp'));
  assert.ok(ids.has('media.hero.public-url'));
});

test('VideoObject is emitted only for complete editorial video; incomplete editorial video is audited',()=>{
  const c=base();c.media.v={type:'video',name:'cocina.mp4',isSeoContent:true,title:'Cocina a la brasa',description:'Proceso real del servicio',thumbnailRef:'https://cdn.example.test/thumb.jpg',contentUrl:'https://cdn.example.test/video.mp4'};
  assert.equal(media.videoObject(c,'v'),null,'uploadDate is required for a justified editorial object');
  assert.ok(media.audit(c).some(x=>x.id==='media.v.video-object'));
  c.media.v.uploadDate='2026-09-14T10:00:00Z';c.media.v.duration='PT45S';c.media.v.transcript='Proceso documentado';c.media.v.captionsRef='/captions/es.vtt';c.media.v.embedUrl='https://video.example.test/embed/1';
  const obj=media.videoObject(c,'v');assert.equal(obj['@type'],'VideoObject');assert.equal(obj.name,'Cocina a la brasa');assert.equal(obj.uploadDate,'2026-09-14T10:00:00Z');
  c.media.loop={type:'video',name:'ambient-loop.mp4',isSeoContent:false,title:'Loop'};assert.equal(media.videoObject(c,'loop'),null);
});


test('semantic AUTO filename ignores UUID-like physical names and persisted SEO dimensions satisfy audit',()=>{
  const c=base();
  c.media.hero={type:'image',name:'hf_20260824_104220_2a0413f3-7a7a-45a4-9fc3-1d63d737b488.png',url:'/assets/hero.png'};
  c.seo.media.hero={width:1600,height:900};
  const a=media.project(c,'hero','2026-09-18T00:00:00.000Z');
  assert.equal(a.seoFilename.value,'casa-hero');
  assert.equal(a.width,1600);
  assert.equal(a.height,900);
  const ids=new Set(media.audit(c).map(x=>x.id));
  assert.ok(!ids.has('media.hero.filename'));
  assert.ok(!ids.has('media.hero.dimensions'));
});
