import{t as mi,ao as fi,X as I,g as m,Q as R,ap as Qe,U as re,x as It,w as Ct,E as Ut,u as Le,G as Ze,aq as _i,ar as vi,as as gi,at as Mi,au as le,av as W,C as V,f as Z,O as Ee,B as b,aw as xi,z as $,H as yi,A as Ri,ax as bt,Z as Ti,ay as wi,ah as Pe,V as me}from"./index-BVpfOd7Y.js";var Me=(e,t,n)=>new Promise((i,r)=>{var o=s=>{try{l(n.next(s))}catch(u){r(u)}},a=s=>{try{l(n.throw(s))}catch(u){r(u)}},l=s=>s.done?i(s.value):Promise.resolve(s.value).then(o,a);l((n=n.apply(e,t)).next())}),T=(e,t,n)=>new Promise((i,r)=>{var o=s=>{try{l(n.next(s))}catch(u){r(u)}},a=s=>{try{l(n.throw(s))}catch(u){r(u)}},l=s=>s.done?i(s.value):Promise.resolve(s.value).then(o,a);l((n=n.apply(e,t)).next())}),Nt=class extends Ee{constructor(e){super(),this.weight=0,this.isBinary=!1,this.overrideBlink="none",this.overrideLookAt="none",this.overrideMouth="none",this._binds=[],this.name=`VRMExpression_${e}`,this.expressionName=e,this.type="VRMExpression",this.visible=!1}get binds(){return this._binds}get overrideBlinkAmount(){return this.overrideBlink==="block"?0<this.outputWeight?1:0:this.overrideBlink==="blend"?this.outputWeight:0}get overrideLookAtAmount(){return this.overrideLookAt==="block"?0<this.outputWeight?1:0:this.overrideLookAt==="blend"?this.outputWeight:0}get overrideMouthAmount(){return this.overrideMouth==="block"?0<this.outputWeight?1:0:this.overrideMouth==="blend"?this.outputWeight:0}get outputWeight(){return this.isBinary?this.weight>.5?1:0:this.weight}addBind(e){this._binds.push(e)}deleteBind(e){const t=this._binds.indexOf(e);t>=0&&this._binds.splice(t,1)}applyWeight(e){var t;let n=this.outputWeight;n*=(t=e?.multiplier)!=null?t:1,this.isBinary&&n<1&&(n=0),this._binds.forEach(i=>i.applyWeight(n))}clearAppliedWeight(){this._binds.forEach(e=>e.clearAppliedWeight())}};function vn(e,t,n){var i,r;const o=e.parser.json,a=(i=o.nodes)==null?void 0:i[t];if(a==null)return console.warn(`extractPrimitivesInternal: Attempt to use nodes[${t}] of glTF but the node doesn't exist`),null;const l=a.mesh;if(l==null)return null;const s=(r=o.meshes)==null?void 0:r[l];if(s==null)return console.warn(`extractPrimitivesInternal: Attempt to use meshes[${l}] of glTF but the mesh doesn't exist`),null;const u=s.primitives.length,d=[];return n.traverse(h=>{d.length<u&&h.isMesh&&d.push(h)}),d}function Vt(e,t){return T(this,null,function*(){const n=yield e.parser.getDependency("node",t);return vn(e,t,n)})}function Dt(e){return T(this,null,function*(){const t=yield e.parser.getDependencies("node"),n=new Map;return t.forEach((i,r)=>{const o=vn(e,r,i);o!=null&&n.set(r,o)}),n})}var ze={Aa:"aa",Ih:"ih",Ou:"ou",Ee:"ee",Oh:"oh",Blink:"blink",Happy:"happy",Angry:"angry",Sad:"sad",Relaxed:"relaxed",LookUp:"lookUp",Surprised:"surprised",LookDown:"lookDown",LookLeft:"lookLeft",LookRight:"lookRight",BlinkLeft:"blinkLeft",BlinkRight:"blinkRight",Neutral:"neutral"};function gn(e){return Math.max(Math.min(e,1),0)}var Ft=class Mn{constructor(){this.blinkExpressionNames=["blink","blinkLeft","blinkRight"],this.lookAtExpressionNames=["lookLeft","lookRight","lookUp","lookDown"],this.mouthExpressionNames=["aa","ee","ih","oh","ou"],this._expressions=[],this._expressionMap={}}get expressions(){return this._expressions.concat()}get expressionMap(){return Object.assign({},this._expressionMap)}get presetExpressionMap(){const t={},n=new Set(Object.values(ze));return Object.entries(this._expressionMap).forEach(([i,r])=>{n.has(i)&&(t[i]=r)}),t}get customExpressionMap(){const t={},n=new Set(Object.values(ze));return Object.entries(this._expressionMap).forEach(([i,r])=>{n.has(i)||(t[i]=r)}),t}copy(t){return this._expressions.concat().forEach(i=>{this.unregisterExpression(i)}),t._expressions.forEach(i=>{this.registerExpression(i)}),this.blinkExpressionNames=t.blinkExpressionNames.concat(),this.lookAtExpressionNames=t.lookAtExpressionNames.concat(),this.mouthExpressionNames=t.mouthExpressionNames.concat(),this}clone(){return new Mn().copy(this)}getExpression(t){var n;return(n=this._expressionMap[t])!=null?n:null}registerExpression(t){this._expressions.push(t),this._expressionMap[t.expressionName]=t}unregisterExpression(t){const n=this._expressions.indexOf(t);n===-1&&console.warn("VRMExpressionManager: The specified expressions is not registered"),this._expressions.splice(n,1),delete this._expressionMap[t.expressionName]}getValue(t){var n;const i=this.getExpression(t);return(n=i?.weight)!=null?n:null}setValue(t,n){const i=this.getExpression(t);i&&(i.weight=gn(n))}resetValues(){this._expressions.forEach(t=>{t.weight=0})}getExpressionTrackName(t){const n=this.getExpression(t);return n?`${n.name}.weight`:null}update(){const t=this._calculateWeightMultipliers();this._expressions.forEach(n=>{n.clearAppliedWeight()}),this._expressions.forEach(n=>{let i=1;const r=n.expressionName;this.blinkExpressionNames.indexOf(r)!==-1&&(i*=t.blink),this.lookAtExpressionNames.indexOf(r)!==-1&&(i*=t.lookAt),this.mouthExpressionNames.indexOf(r)!==-1&&(i*=t.mouth),n.applyWeight({multiplier:i})})}_calculateWeightMultipliers(){let t=1,n=1,i=1;return this._expressions.forEach(r=>{t-=r.overrideBlinkAmount,n-=r.overrideLookAtAmount,i-=r.overrideMouthAmount}),t=Math.max(0,t),n=Math.max(0,n),i=Math.max(0,i),{blink:t,lookAt:n,mouth:i}}},ue={Color:"color",EmissionColor:"emissionColor",ShadeColor:"shadeColor",RimColor:"rimColor",OutlineColor:"outlineColor"},Si={_Color:ue.Color,_EmissionColor:ue.EmissionColor,_ShadeColor:ue.ShadeColor,_RimColor:ue.RimColor,_OutlineColor:ue.OutlineColor},Ei=new V,xn=class yn{constructor({material:t,type:n,targetValue:i,targetAlpha:r}){this.material=t,this.type=n,this.targetValue=i,this.targetAlpha=r??1;const o=this._initColorBindState(),a=this._initAlphaBindState();this._state={color:o,alpha:a}}applyWeight(t){const{color:n,alpha:i}=this._state;if(n!=null){const{propertyName:r,deltaValue:o}=n,a=this.material[r];a?.add(Ei.copy(o).multiplyScalar(t))}if(i!=null){const{propertyName:r,deltaValue:o}=i;this.material[r]!=null&&(this.material[r]+=o*t)}}clearAppliedWeight(){const{color:t,alpha:n}=this._state;if(t!=null){const{propertyName:i,initialValue:r}=t,o=this.material[i];o?.copy(r)}if(n!=null){const{propertyName:i,initialValue:r}=n;this.material[i]!=null&&(this.material[i]=r)}}_initColorBindState(){var t,n,i;const{material:r,type:o,targetValue:a}=this,l=this._getPropertyNameMap(),s=(n=(t=l?.[o])==null?void 0:t[0])!=null?n:null;if(s==null)return console.warn(`Tried to add a material color bind to the material ${(i=r.name)!=null?i:"(no name)"}, the type ${o} but the material or the type is not supported.`),null;const d=r[s].clone(),h=new V(a.r-d.r,a.g-d.g,a.b-d.b);return{propertyName:s,initialValue:d,deltaValue:h}}_initAlphaBindState(){var t,n,i;const{material:r,type:o,targetAlpha:a}=this,l=this._getPropertyNameMap(),s=(n=(t=l?.[o])==null?void 0:t[1])!=null?n:null;if(s==null&&a!==1)return console.warn(`Tried to add a material alpha bind to the material ${(i=r.name)!=null?i:"(no name)"}, the type ${o} but the material or the type does not support alpha.`),null;if(s==null)return null;const u=r[s],d=a-u;return{propertyName:s,initialValue:u,deltaValue:d}}_getPropertyNameMap(){var t,n;return(n=(t=Object.entries(yn._propertyNameMapMap).find(([i])=>this.material[i]===!0))==null?void 0:t[1])!=null?n:null}};xn._propertyNameMapMap={isMeshStandardMaterial:{color:["color","opacity"],emissionColor:["emissive",null]},isMeshBasicMaterial:{color:["color","opacity"]},isMToonMaterial:{color:["color","opacity"],emissionColor:["emissive",null],outlineColor:["outlineColorFactor",null],matcapColor:["matcapFactor",null],rimColor:["parametricRimColorFactor",null],shadeColor:["shadeColorFactor",null]}};var Bt=xn,Ht=class{constructor({primitives:e,index:t,weight:n}){this.primitives=e,this.index=t,this.weight=n}applyWeight(e){this.primitives.forEach(t=>{var n;((n=t.morphTargetInfluences)==null?void 0:n[this.index])!=null&&(t.morphTargetInfluences[this.index]+=this.weight*e)})}clearAppliedWeight(){this.primitives.forEach(e=>{var t;((t=e.morphTargetInfluences)==null?void 0:t[this.index])!=null&&(e.morphTargetInfluences[this.index]=0)})}},Wt=new me,Rn=class Tn{constructor({material:t,scale:n,offset:i}){var r,o;this.material=t,this.scale=n,this.offset=i;const a=(r=Object.entries(Tn._propertyNamesMap).find(([l])=>t[l]===!0))==null?void 0:r[1];a==null?(console.warn(`Tried to add a texture transform bind to the material ${(o=t.name)!=null?o:"(no name)"} but the material is not supported.`),this._properties=[]):(this._properties=[],a.forEach(l=>{var s;const u=(s=t[l])==null?void 0:s.clone();if(!u)return null;t[l]=u;const d=u.offset.clone(),h=u.repeat.clone(),f=i.clone().sub(d),c=n.clone().sub(h);this._properties.push({name:l,initialOffset:d,deltaOffset:f,initialScale:h,deltaScale:c})}))}applyWeight(t){this._properties.forEach(n=>{const i=this.material[n.name];i!==void 0&&(i.offset.add(Wt.copy(n.deltaOffset).multiplyScalar(t)),i.repeat.add(Wt.copy(n.deltaScale).multiplyScalar(t)))})}clearAppliedWeight(){this._properties.forEach(t=>{const n=this.material[t.name];n!==void 0&&(n.offset.copy(t.initialOffset),n.repeat.copy(t.initialScale))})}};Rn._propertyNamesMap={isMeshStandardMaterial:["map","emissiveMap","bumpMap","normalMap","displacementMap","roughnessMap","metalnessMap","alphaMap"],isMeshBasicMaterial:["map","specularMap","alphaMap"],isMToonMaterial:["map","normalMap","emissiveMap","shadeMultiplyTexture","rimMultiplyTexture","outlineWidthMultiplyTexture","uvAnimationMaskTexture"]};var kt=Rn,Pi=new Set(["1.0","1.0-beta"]),wn=class Sn{get name(){return"VRMExpressionLoaderPlugin"}constructor(t){this.parser=t}afterRoot(t){return T(this,null,function*(){t.userData.vrmExpressionManager=yield this._import(t)})}_import(t){return T(this,null,function*(){const n=yield this._v1Import(t);if(n)return n;const i=yield this._v0Import(t);return i||null})}_v1Import(t){return T(this,null,function*(){var n,i;const r=this.parser.json;if(!(((n=r.extensionsUsed)==null?void 0:n.indexOf("VRMC_vrm"))!==-1))return null;const a=(i=r.extensions)==null?void 0:i.VRMC_vrm;if(!a)return null;const l=a.specVersion;if(!Pi.has(l))return console.warn(`VRMExpressionLoaderPlugin: Unknown VRMC_vrm specVersion "${l}"`),null;const s=a.expressions;if(!s)return null;const u=new Set(Object.values(ze)),d=new Map;s.preset!=null&&Object.entries(s.preset).forEach(([f,c])=>{if(c!=null){if(!u.has(f)){console.warn(`VRMExpressionLoaderPlugin: Unknown preset name "${f}" detected. Ignoring the expression`);return}d.set(f,c)}}),s.custom!=null&&Object.entries(s.custom).forEach(([f,c])=>{if(u.has(f)){console.warn(`VRMExpressionLoaderPlugin: Custom expression cannot have preset name "${f}". Ignoring the expression`);return}d.set(f,c)});const h=new Ft;return yield Promise.all(Array.from(d.entries()).map(f=>T(this,[f],function*([c,_]){var p,v,g,L,w,y,M;const x=new Nt(c);if(t.scene.add(x),x.isBinary=(p=_.isBinary)!=null?p:!1,x.overrideBlink=(v=_.overrideBlink)!=null?v:"none",x.overrideLookAt=(g=_.overrideLookAt)!=null?g:"none",x.overrideMouth=(L=_.overrideMouth)!=null?L:"none",(w=_.morphTargetBinds)==null||w.forEach(S=>T(this,null,function*(){var A;if(S.node===void 0||S.index===void 0)return;const O=yield Vt(t,S.node),E=S.index;if(!O.every(P=>Array.isArray(P.morphTargetInfluences)&&E<P.morphTargetInfluences.length)){console.warn(`VRMExpressionLoaderPlugin: ${_.name} attempts to index morph #${E} but not found.`);return}x.addBind(new Ht({primitives:O,index:E,weight:(A=S.weight)!=null?A:1}))})),_.materialColorBinds||_.textureTransformBinds){const S=[];t.scene.traverse(A=>{const O=A.material;O&&(Array.isArray(O)?S.push(...O):S.push(O))}),(y=_.materialColorBinds)==null||y.forEach(A=>T(this,null,function*(){S.filter(E=>{var P;const C=(P=this.parser.associations.get(E))==null?void 0:P.materials;return A.material===C}).forEach(E=>{x.addBind(new Bt({material:E,type:A.type,targetValue:new V().fromArray(A.targetValue),targetAlpha:A.targetValue[3]}))})})),(M=_.textureTransformBinds)==null||M.forEach(A=>T(this,null,function*(){S.filter(E=>{var P;const C=(P=this.parser.associations.get(E))==null?void 0:P.materials;return A.material===C}).forEach(E=>{var P,C;x.addBind(new kt({material:E,offset:new me().fromArray((P=A.offset)!=null?P:[0,0]),scale:new me().fromArray((C=A.scale)!=null?C:[1,1])}))})}))}h.registerExpression(x)}))),h})}_v0Import(t){return T(this,null,function*(){var n;const i=this.parser.json,r=(n=i.extensions)==null?void 0:n.VRM;if(!r)return null;const o=r.blendShapeMaster;if(!o)return null;const a=new Ft,l=o.blendShapeGroups;if(!l)return a;const s=new Set;return yield Promise.all(l.map(u=>T(this,null,function*(){var d;const h=u.presetName,f=h!=null&&Sn.v0v1PresetNameMap[h]||null,c=f??u.name;if(c==null){console.warn("VRMExpressionLoaderPlugin: One of custom expressions has no name. Ignoring the expression");return}if(s.has(c)){console.warn(`VRMExpressionLoaderPlugin: An expression preset ${h} has duplicated entries. Ignoring the expression`);return}s.add(c);const _=new Nt(c);t.scene.add(_),_.isBinary=(d=u.isBinary)!=null?d:!1,u.binds&&u.binds.forEach(v=>T(this,null,function*(){var g;if(v.mesh===void 0||v.index===void 0)return;const L=[];(g=i.nodes)==null||g.forEach((y,M)=>{y.mesh===v.mesh&&L.push(M)});const w=v.index;yield Promise.all(L.map(y=>T(this,null,function*(){var M;const x=yield Vt(t,y);if(!x.every(S=>Array.isArray(S.morphTargetInfluences)&&w<S.morphTargetInfluences.length)){console.warn(`VRMExpressionLoaderPlugin: ${u.name} attempts to index ${w}th morph but not found.`);return}_.addBind(new Ht({primitives:x,index:w,weight:.01*((M=v.weight)!=null?M:100)}))})))}));const p=u.materialValues;p&&p.length!==0&&p.forEach(v=>{if(v.materialName===void 0||v.propertyName===void 0||v.targetValue===void 0)return;const g=[];t.scene.traverse(w=>{if(w.material){const y=w.material;Array.isArray(y)?g.push(...y.filter(M=>(M.name===v.materialName||M.name===v.materialName+" (Outline)")&&g.indexOf(M)===-1)):y.name===v.materialName&&g.indexOf(y)===-1&&g.push(y)}});const L=v.propertyName;g.forEach(w=>{if(L==="_MainTex_ST"){const M=new me(v.targetValue[0],v.targetValue[1]),x=new me(v.targetValue[2],v.targetValue[3]);x.y=1-x.y-M.y,_.addBind(new kt({material:w,scale:M,offset:x}));return}const y=Si[L];if(y){_.addBind(new Bt({material:w,type:y,targetValue:new V().fromArray(v.targetValue),targetAlpha:v.targetValue[3]}));return}console.warn(L+" is not supported")})}),a.registerExpression(_)}))),a})}};wn.v0v1PresetNameMap={a:"aa",e:"ee",i:"ih",o:"oh",u:"ou",blink:"blink",joy:"happy",angry:"angry",sorrow:"sad",fun:"relaxed",lookup:"lookUp",lookdown:"lookDown",lookleft:"lookLeft",lookright:"lookRight",blink_l:"blinkLeft",blink_r:"blinkRight",neutral:"neutral"};var Ai=wn,$e=class ne{constructor(t,n){this._firstPersonOnlyLayer=ne.DEFAULT_FIRSTPERSON_ONLY_LAYER,this._thirdPersonOnlyLayer=ne.DEFAULT_THIRDPERSON_ONLY_LAYER,this._initializedLayers=!1,this.humanoid=t,this.meshAnnotations=n}copy(t){if(this.humanoid!==t.humanoid)throw new Error("VRMFirstPerson: humanoid must be same in order to copy");return this.meshAnnotations=t.meshAnnotations.map(n=>({meshes:n.meshes.concat(),type:n.type})),this}clone(){return new ne(this.humanoid,this.meshAnnotations).copy(this)}get firstPersonOnlyLayer(){return this._firstPersonOnlyLayer}get thirdPersonOnlyLayer(){return this._thirdPersonOnlyLayer}setup({firstPersonOnlyLayer:t=ne.DEFAULT_FIRSTPERSON_ONLY_LAYER,thirdPersonOnlyLayer:n=ne.DEFAULT_THIRDPERSON_ONLY_LAYER}={}){this._initializedLayers||(this._firstPersonOnlyLayer=t,this._thirdPersonOnlyLayer=n,this.meshAnnotations.forEach(i=>{i.meshes.forEach(r=>{i.type==="firstPersonOnly"?(r.layers.set(this._firstPersonOnlyLayer),r.traverse(o=>o.layers.set(this._firstPersonOnlyLayer))):i.type==="thirdPersonOnly"?(r.layers.set(this._thirdPersonOnlyLayer),r.traverse(o=>o.layers.set(this._thirdPersonOnlyLayer))):i.type==="auto"&&this._createHeadlessModel(r)})}),this._initializedLayers=!0)}_excludeTriangles(t,n,i,r){let o=0;if(n!=null&&n.length>0)for(let a=0;a<t.length;a+=3){const l=t[a],s=t[a+1],u=t[a+2],d=n[l],h=i[l];if(d[0]>0&&r.includes(h[0])||d[1]>0&&r.includes(h[1])||d[2]>0&&r.includes(h[2])||d[3]>0&&r.includes(h[3]))continue;const f=n[s],c=i[s];if(f[0]>0&&r.includes(c[0])||f[1]>0&&r.includes(c[1])||f[2]>0&&r.includes(c[2])||f[3]>0&&r.includes(c[3]))continue;const _=n[u],p=i[u];_[0]>0&&r.includes(p[0])||_[1]>0&&r.includes(p[1])||_[2]>0&&r.includes(p[2])||_[3]>0&&r.includes(p[3])||(t[o++]=l,t[o++]=s,t[o++]=u)}return o}_createErasedMesh(t,n){const i=new Ri(t.geometry.clone(),t.material);i.name=`${t.name}(erase)`,i.frustumCulled=t.frustumCulled,i.layers.set(this._firstPersonOnlyLayer);const r=i.geometry,o=r.getAttribute("skinIndex"),a=o instanceof bt?[]:o.array,l=[];for(let p=0;p<a.length;p+=4)l.push([a[p],a[p+1],a[p+2],a[p+3]]);const s=r.getAttribute("skinWeight"),u=s instanceof bt?[]:s.array,d=[];for(let p=0;p<u.length;p+=4)d.push([u[p],u[p+1],u[p+2],u[p+3]]);const h=r.getIndex();if(!h)throw new Error("The geometry doesn't have an index buffer");const f=Array.from(h.array),c=this._excludeTriangles(f,d,l,n),_=[];for(let p=0;p<c;p++)_[p]=f[p];return r.setIndex(_),t.onBeforeRender&&(i.onBeforeRender=t.onBeforeRender),i.bind(new Ti(t.skeleton.bones,t.skeleton.boneInverses),new Z),i}_createHeadlessModelForSkinnedMesh(t,n){const i=[];if(n.skeleton.bones.forEach((o,a)=>{this._isEraseTarget(o)&&i.push(a)}),!i.length){n.layers.enable(this._thirdPersonOnlyLayer),n.layers.enable(this._firstPersonOnlyLayer);return}n.layers.set(this._thirdPersonOnlyLayer);const r=this._createErasedMesh(n,i);t.add(r)}_createHeadlessModel(t){if(t.type==="Group")if(t.layers.set(this._thirdPersonOnlyLayer),this._isEraseTarget(t))t.traverse(n=>n.layers.set(this._thirdPersonOnlyLayer));else{const n=new re;n.name=`_headless_${t.name}`,n.layers.set(this._firstPersonOnlyLayer),t.parent.add(n),t.children.filter(i=>i.type==="SkinnedMesh").forEach(i=>{const r=i;this._createHeadlessModelForSkinnedMesh(n,r)})}else if(t.type==="SkinnedMesh"){const n=t;this._createHeadlessModelForSkinnedMesh(t.parent,n)}else this._isEraseTarget(t)&&(t.layers.set(this._thirdPersonOnlyLayer),t.traverse(n=>n.layers.set(this._thirdPersonOnlyLayer)))}_isEraseTarget(t){return t===this.humanoid.getRawBoneNode("head")?!0:t.parent?this._isEraseTarget(t.parent):!1}};$e.DEFAULT_FIRSTPERSON_ONLY_LAYER=9;$e.DEFAULT_THIRDPERSON_ONLY_LAYER=10;var zt=$e,Li=new Set(["1.0","1.0-beta"]),Oi=class{get name(){return"VRMFirstPersonLoaderPlugin"}constructor(e){this.parser=e}afterRoot(e){return T(this,null,function*(){const t=e.userData.vrmHumanoid;if(t!==null){if(t===void 0)throw new Error("VRMFirstPersonLoaderPlugin: vrmHumanoid is undefined. VRMHumanoidLoaderPlugin have to be used first");e.userData.vrmFirstPerson=yield this._import(e,t)}})}_import(e,t){return T(this,null,function*(){if(t==null)return null;const n=yield this._v1Import(e,t);if(n)return n;const i=yield this._v0Import(e,t);return i||null})}_v1Import(e,t){return T(this,null,function*(){var n,i;const r=this.parser.json;if(!(((n=r.extensionsUsed)==null?void 0:n.indexOf("VRMC_vrm"))!==-1))return null;const a=(i=r.extensions)==null?void 0:i.VRMC_vrm;if(!a)return null;const l=a.specVersion;if(!Li.has(l))return console.warn(`VRMFirstPersonLoaderPlugin: Unknown VRMC_vrm specVersion "${l}"`),null;const s=a.firstPerson,u=[],d=yield Dt(e);return Array.from(d.entries()).forEach(([h,f])=>{var c,_;const p=(c=s?.meshAnnotations)==null?void 0:c.find(v=>v.node===h);u.push({meshes:f,type:(_=p?.type)!=null?_:"auto"})}),new zt(t,u)})}_v0Import(e,t){return T(this,null,function*(){var n;const i=this.parser.json,r=(n=i.extensions)==null?void 0:n.VRM;if(!r)return null;const o=r.firstPerson;if(!o)return null;const a=[],l=yield Dt(e);return Array.from(l.entries()).forEach(([s,u])=>{const d=i.nodes[s],h=o.meshAnnotations?o.meshAnnotations.find(f=>f.mesh===d.mesh):void 0;a.push({meshes:u,type:this._convertV0FlagToV1Type(h?.firstPersonFlag)})}),new zt(t,a)})}_convertV0FlagToV1Type(e){return e==="FirstPersonOnly"?"firstPersonOnly":e==="ThirdPersonOnly"?"thirdPersonOnly":e==="Both"?"both":"auto"}},Xt=new m,jt=new m,Ii=new R,Gt=class extends re{constructor(e){super(),this.vrmHumanoid=e,this._boneAxesMap=new Map,Object.values(e.humanBones).forEach(t=>{const n=new wi(1);n.matrixAutoUpdate=!1,n.material.depthTest=!1,n.material.depthWrite=!1,this.add(n),this._boneAxesMap.set(t,n)})}dispose(){Array.from(this._boneAxesMap.values()).forEach(e=>{e.geometry.dispose(),e.material.dispose()})}updateMatrixWorld(e){Array.from(this._boneAxesMap.entries()).forEach(([t,n])=>{t.node.updateWorldMatrix(!0,!1),t.node.matrixWorld.decompose(Xt,Ii,jt);const i=Xt.set(.1,.1,.1).divide(jt);n.matrix.copy(t.node.matrixWorld).scale(i)}),super.updateMatrixWorld(e)}},Ce=["hips","spine","chest","upperChest","neck","head","leftEye","rightEye","jaw","leftUpperLeg","leftLowerLeg","leftFoot","leftToes","rightUpperLeg","rightLowerLeg","rightFoot","rightToes","leftShoulder","leftUpperArm","leftLowerArm","leftHand","rightShoulder","rightUpperArm","rightLowerArm","rightHand","leftThumbMetacarpal","leftThumbProximal","leftThumbDistal","leftIndexProximal","leftIndexIntermediate","leftIndexDistal","leftMiddleProximal","leftMiddleIntermediate","leftMiddleDistal","leftRingProximal","leftRingIntermediate","leftRingDistal","leftLittleProximal","leftLittleIntermediate","leftLittleDistal","rightThumbMetacarpal","rightThumbProximal","rightThumbDistal","rightIndexProximal","rightIndexIntermediate","rightIndexDistal","rightMiddleProximal","rightMiddleIntermediate","rightMiddleDistal","rightRingProximal","rightRingIntermediate","rightRingDistal","rightLittleProximal","rightLittleIntermediate","rightLittleDistal"],Ci={hips:null,spine:"hips",chest:"spine",upperChest:"chest",neck:"upperChest",head:"neck",leftEye:"head",rightEye:"head",jaw:"head",leftUpperLeg:"hips",leftLowerLeg:"leftUpperLeg",leftFoot:"leftLowerLeg",leftToes:"leftFoot",rightUpperLeg:"hips",rightLowerLeg:"rightUpperLeg",rightFoot:"rightLowerLeg",rightToes:"rightFoot",leftShoulder:"upperChest",leftUpperArm:"leftShoulder",leftLowerArm:"leftUpperArm",leftHand:"leftLowerArm",rightShoulder:"upperChest",rightUpperArm:"rightShoulder",rightLowerArm:"rightUpperArm",rightHand:"rightLowerArm",leftThumbMetacarpal:"leftHand",leftThumbProximal:"leftThumbMetacarpal",leftThumbDistal:"leftThumbProximal",leftIndexProximal:"leftHand",leftIndexIntermediate:"leftIndexProximal",leftIndexDistal:"leftIndexIntermediate",leftMiddleProximal:"leftHand",leftMiddleIntermediate:"leftMiddleProximal",leftMiddleDistal:"leftMiddleIntermediate",leftRingProximal:"leftHand",leftRingIntermediate:"leftRingProximal",leftRingDistal:"leftRingIntermediate",leftLittleProximal:"leftHand",leftLittleIntermediate:"leftLittleProximal",leftLittleDistal:"leftLittleIntermediate",rightThumbMetacarpal:"rightHand",rightThumbProximal:"rightThumbMetacarpal",rightThumbDistal:"rightThumbProximal",rightIndexProximal:"rightHand",rightIndexIntermediate:"rightIndexProximal",rightIndexDistal:"rightIndexIntermediate",rightMiddleProximal:"rightHand",rightMiddleIntermediate:"rightMiddleProximal",rightMiddleDistal:"rightMiddleIntermediate",rightRingProximal:"rightHand",rightRingIntermediate:"rightRingProximal",rightRingDistal:"rightRingIntermediate",rightLittleProximal:"rightHand",rightLittleIntermediate:"rightLittleProximal",rightLittleDistal:"rightLittleIntermediate"};function En(e){return e.invert?e.invert():e.inverse(),e}var G=new m,Y=new R,Xe=class{constructor(e){this.humanBones=e,this.restPose=this.getAbsolutePose()}getAbsolutePose(){const e={};return Object.keys(this.humanBones).forEach(t=>{const n=t,i=this.getBoneNode(n);i&&(G.copy(i.position),Y.copy(i.quaternion),e[n]={position:G.toArray(),rotation:Y.toArray()})}),e}getPose(){const e={};return Object.keys(this.humanBones).forEach(t=>{const n=t,i=this.getBoneNode(n);if(!i)return;G.set(0,0,0),Y.identity();const r=this.restPose[n];r?.position&&G.fromArray(r.position).negate(),r?.rotation&&En(Y.fromArray(r.rotation)),G.add(i.position),Y.premultiply(i.quaternion),e[n]={position:G.toArray(),rotation:Y.toArray()}}),e}setPose(e){Object.entries(e).forEach(([t,n])=>{const i=t,r=this.getBoneNode(i);if(!r)return;const o=this.restPose[i];o&&(n?.position&&(r.position.fromArray(n.position),o.position&&r.position.add(G.fromArray(o.position))),n?.rotation&&(r.quaternion.fromArray(n.rotation),o.rotation&&r.quaternion.multiply(Y.fromArray(o.rotation))))})}resetPose(){Object.entries(this.restPose).forEach(([e,t])=>{const n=this.getBoneNode(e);n&&(t?.position&&n.position.fromArray(t.position),t?.rotation&&n.quaternion.fromArray(t.rotation))})}getBone(e){var t;return(t=this.humanBones[e])!=null?t:void 0}getBoneNode(e){var t,n;return(n=(t=this.humanBones[e])==null?void 0:t.node)!=null?n:null}},Ue=new m,Ui=new R,bi=new m,Yt=class Pn extends Xe{static _setupTransforms(t){const n=new Ee;n.name="VRMHumanoidRig";const i={},r={},o={};Ce.forEach(l=>{var s;const u=t.getBoneNode(l);if(u){const d=new m,h=new R;u.updateWorldMatrix(!0,!1),u.matrixWorld.decompose(d,h,Ue),i[l]=d,r[l]=u.quaternion.clone();const f=new R;(s=u.parent)==null||s.matrixWorld.decompose(Ue,f,Ue),o[l]=f}});const a={};return Ce.forEach(l=>{var s;const u=t.getBoneNode(l);if(u){const d=i[l];let h=l,f;for(;f==null&&(h=Ci[h],h!=null);)f=i[h];const c=new Ee;c.name="Normalized_"+u.name,(h?(s=a[h])==null?void 0:s.node:n).add(c),c.position.copy(d),f&&c.position.sub(f),a[l]={node:c}}}),{rigBones:a,root:n,parentWorldRotations:o,boneRotations:r}}constructor(t){const{rigBones:n,root:i,parentWorldRotations:r,boneRotations:o}=Pn._setupTransforms(t);super(n),this.original=t,this.root=i,this._parentWorldRotations=r,this._boneRotations=o}update(){Ce.forEach(t=>{const n=this.original.getBoneNode(t);if(n!=null){const i=this.getBoneNode(t),r=this._parentWorldRotations[t],o=Ui.copy(r).invert(),a=this._boneRotations[t];if(n.quaternion.copy(i.quaternion).multiply(r).premultiply(o).multiply(a),t==="hips"){const l=i.getWorldPosition(bi);n.parent.updateWorldMatrix(!0,!1);const s=n.parent.matrixWorld,u=l.applyMatrix4(s.invert());n.position.copy(u)}}})}},qt=class An{get restPose(){return console.warn("VRMHumanoid: restPose is deprecated. Use either rawRestPose or normalizedRestPose instead."),this.rawRestPose}get rawRestPose(){return this._rawHumanBones.restPose}get normalizedRestPose(){return this._normalizedHumanBones.restPose}get humanBones(){return this._rawHumanBones.humanBones}get rawHumanBones(){return this._rawHumanBones.humanBones}get normalizedHumanBones(){return this._normalizedHumanBones.humanBones}get normalizedHumanBonesRoot(){return this._normalizedHumanBones.root}constructor(t,n){var i;this.autoUpdateHumanBones=(i=n?.autoUpdateHumanBones)!=null?i:!0,this._rawHumanBones=new Xe(t),this._normalizedHumanBones=new Yt(this._rawHumanBones)}copy(t){return this.autoUpdateHumanBones=t.autoUpdateHumanBones,this._rawHumanBones=new Xe(t.humanBones),this._normalizedHumanBones=new Yt(this._rawHumanBones),this}clone(){return new An(this.humanBones,{autoUpdateHumanBones:this.autoUpdateHumanBones}).copy(this)}getAbsolutePose(){return console.warn("VRMHumanoid: getAbsolutePose() is deprecated. Use either getRawAbsolutePose() or getNormalizedAbsolutePose() instead."),this.getRawAbsolutePose()}getRawAbsolutePose(){return this._rawHumanBones.getAbsolutePose()}getNormalizedAbsolutePose(){return this._normalizedHumanBones.getAbsolutePose()}getPose(){return console.warn("VRMHumanoid: getPose() is deprecated. Use either getRawPose() or getNormalizedPose() instead."),this.getRawPose()}getRawPose(){return this._rawHumanBones.getPose()}getNormalizedPose(){return this._normalizedHumanBones.getPose()}setPose(t){return console.warn("VRMHumanoid: setPose() is deprecated. Use either setRawPose() or setNormalizedPose() instead."),this.setRawPose(t)}setRawPose(t){return this._rawHumanBones.setPose(t)}setNormalizedPose(t){return this._normalizedHumanBones.setPose(t)}resetPose(){return console.warn("VRMHumanoid: resetPose() is deprecated. Use either resetRawPose() or resetNormalizedPose() instead."),this.resetRawPose()}resetRawPose(){return this._rawHumanBones.resetPose()}resetNormalizedPose(){return this._normalizedHumanBones.resetPose()}getBone(t){return console.warn("VRMHumanoid: getBone() is deprecated. Use either getRawBone() or getNormalizedBone() instead."),this.getRawBone(t)}getRawBone(t){return this._rawHumanBones.getBone(t)}getNormalizedBone(t){return this._normalizedHumanBones.getBone(t)}getBoneNode(t){return console.warn("VRMHumanoid: getBoneNode() is deprecated. Use either getRawBoneNode() or getNormalizedBoneNode() instead."),this.getRawBoneNode(t)}getRawBoneNode(t){return this._rawHumanBones.getBoneNode(t)}getNormalizedBoneNode(t){return this._normalizedHumanBones.getBoneNode(t)}update(){this.autoUpdateHumanBones&&this._normalizedHumanBones.update()}},Ni={Hips:"hips",Spine:"spine",Head:"head",LeftUpperLeg:"leftUpperLeg",LeftLowerLeg:"leftLowerLeg",LeftFoot:"leftFoot",RightUpperLeg:"rightUpperLeg",RightLowerLeg:"rightLowerLeg",RightFoot:"rightFoot",LeftUpperArm:"leftUpperArm",LeftLowerArm:"leftLowerArm",LeftHand:"leftHand",RightUpperArm:"rightUpperArm",RightLowerArm:"rightLowerArm",RightHand:"rightHand"},Vi=new Set(["1.0","1.0-beta"]),Qt={leftThumbProximal:"leftThumbMetacarpal",leftThumbIntermediate:"leftThumbProximal",rightThumbProximal:"rightThumbMetacarpal",rightThumbIntermediate:"rightThumbProximal"},Di=class{get name(){return"VRMHumanoidLoaderPlugin"}constructor(e,t){this.parser=e,this.helperRoot=t?.helperRoot,this.autoUpdateHumanBones=t?.autoUpdateHumanBones}afterRoot(e){return T(this,null,function*(){e.userData.vrmHumanoid=yield this._import(e)})}_import(e){return T(this,null,function*(){const t=yield this._v1Import(e);if(t)return t;const n=yield this._v0Import(e);return n||null})}_v1Import(e){return T(this,null,function*(){var t,n;const i=this.parser.json;if(!(((t=i.extensionsUsed)==null?void 0:t.indexOf("VRMC_vrm"))!==-1))return null;const o=(n=i.extensions)==null?void 0:n.VRMC_vrm;if(!o)return null;const a=o.specVersion;if(!Vi.has(a))return console.warn(`VRMHumanoidLoaderPlugin: Unknown VRMC_vrm specVersion "${a}"`),null;const l=o.humanoid;if(!l)return null;const s=l.humanBones.leftThumbIntermediate!=null||l.humanBones.rightThumbIntermediate!=null,u={};l.humanBones!=null&&(yield Promise.all(Object.entries(l.humanBones).map(h=>T(this,[h],function*([f,c]){let _=f;const p=c.node;if(s){const g=Qt[_];g!=null&&(_=g)}const v=yield this.parser.getDependency("node",p);if(v==null){console.warn(`A glTF node bound to the humanoid bone ${_} (index = ${p}) does not exist`);return}u[_]={node:v}}))));const d=new qt(this._ensureRequiredBonesExist(u),{autoUpdateHumanBones:this.autoUpdateHumanBones});if(e.scene.add(d.normalizedHumanBonesRoot),this.helperRoot){const h=new Gt(d);this.helperRoot.add(h),h.renderOrder=this.helperRoot.renderOrder}return d})}_v0Import(e){return T(this,null,function*(){var t;const i=(t=this.parser.json.extensions)==null?void 0:t.VRM;if(!i)return null;const r=i.humanoid;if(!r)return null;const o={};r.humanBones!=null&&(yield Promise.all(r.humanBones.map(l=>T(this,null,function*(){const s=l.bone,u=l.node;if(s==null||u==null)return;const d=yield this.parser.getDependency("node",u);if(d==null){console.warn(`A glTF node bound to the humanoid bone ${s} (index = ${u}) does not exist`);return}const h=Qt[s],f=h??s;if(o[f]!=null){console.warn(`Multiple bone entries for ${f} detected (index = ${u}), ignoring duplicated entries.`);return}o[f]={node:d}}))));const a=new qt(this._ensureRequiredBonesExist(o),{autoUpdateHumanBones:this.autoUpdateHumanBones});if(e.scene.add(a.normalizedHumanBonesRoot),this.helperRoot){const l=new Gt(a);this.helperRoot.add(l),l.renderOrder=this.helperRoot.renderOrder}return a})}_ensureRequiredBonesExist(e){const t=Object.values(Ni).filter(n=>e[n]==null);if(t.length>0)throw new Error(`VRMHumanoidLoaderPlugin: These humanoid bones are required but not exist: ${t.join(", ")}`);return e}},Zt=class extends ${constructor(){super(),this._currentTheta=0,this._currentRadius=0,this.theta=0,this.radius=0,this._currentTheta=0,this._currentRadius=0,this._attrPos=new b(new Float32Array(195),3),this.setAttribute("position",this._attrPos),this._attrIndex=new b(new Uint16Array(189),1),this.setIndex(this._attrIndex),this._buildIndex(),this.update()}update(){let e=!1;this._currentTheta!==this.theta&&(this._currentTheta=this.theta,e=!0),this._currentRadius!==this.radius&&(this._currentRadius=this.radius,e=!0),e&&this._buildPosition()}_buildPosition(){this._attrPos.setXYZ(0,0,0,0);for(let e=0;e<64;e++){const t=e/63*this._currentTheta;this._attrPos.setXYZ(e+1,this._currentRadius*Math.sin(t),0,this._currentRadius*Math.cos(t))}this._attrPos.needsUpdate=!0}_buildIndex(){for(let e=0;e<63;e++)this._attrIndex.setXYZ(e*3,0,e+1,e+2);this._attrIndex.needsUpdate=!0}},Fi=class extends ${constructor(){super(),this.radius=0,this._currentRadius=0,this.tail=new m,this._currentTail=new m,this._attrPos=new b(new Float32Array(294),3),this.setAttribute("position",this._attrPos),this._attrIndex=new b(new Uint16Array(194),1),this.setIndex(this._attrIndex),this._buildIndex(),this.update()}update(){let e=!1;this._currentRadius!==this.radius&&(this._currentRadius=this.radius,e=!0),this._currentTail.equals(this.tail)||(this._currentTail.copy(this.tail),e=!0),e&&this._buildPosition()}_buildPosition(){for(let e=0;e<32;e++){const t=e/16*Math.PI;this._attrPos.setXYZ(e,Math.cos(t),Math.sin(t),0),this._attrPos.setXYZ(32+e,0,Math.cos(t),Math.sin(t)),this._attrPos.setXYZ(64+e,Math.sin(t),0,Math.cos(t))}this.scale(this._currentRadius,this._currentRadius,this._currentRadius),this.translate(this._currentTail.x,this._currentTail.y,this._currentTail.z),this._attrPos.setXYZ(96,0,0,0),this._attrPos.setXYZ(97,this._currentTail.x,this._currentTail.y,this._currentTail.z),this._attrPos.needsUpdate=!0}_buildIndex(){for(let e=0;e<32;e++){const t=(e+1)%32;this._attrIndex.setXY(e*2,e,t),this._attrIndex.setXY(64+e*2,32+e,32+t),this._attrIndex.setXY(128+e*2,64+e,64+t)}this._attrIndex.setXY(192,96,97),this._attrIndex.needsUpdate=!0}},xe=new R,$t=new R,de=new m,Jt=new m,Kt=Math.sqrt(2)/2,Bi=new R(0,0,-Kt,Kt),Hi=new m(0,1,0),Wi=class extends re{constructor(e){super(),this.matrixAutoUpdate=!1,this.vrmLookAt=e;{const t=new Zt;t.radius=.5;const n=new It({color:65280,transparent:!0,opacity:.5,side:Ct,depthTest:!1,depthWrite:!1});this._meshPitch=new Ut(t,n),this.add(this._meshPitch)}{const t=new Zt;t.radius=.5;const n=new It({color:16711680,transparent:!0,opacity:.5,side:Ct,depthTest:!1,depthWrite:!1});this._meshYaw=new Ut(t,n),this.add(this._meshYaw)}{const t=new Fi;t.radius=.1;const n=new Le({color:16777215,depthTest:!1,depthWrite:!1});this._lineTarget=new Ze(t,n),this._lineTarget.frustumCulled=!1,this.add(this._lineTarget)}}dispose(){this._meshYaw.geometry.dispose(),this._meshYaw.material.dispose(),this._meshPitch.geometry.dispose(),this._meshPitch.material.dispose(),this._lineTarget.geometry.dispose(),this._lineTarget.material.dispose()}updateMatrixWorld(e){const t=I.DEG2RAD*this.vrmLookAt.yaw;this._meshYaw.geometry.theta=t,this._meshYaw.geometry.update();const n=I.DEG2RAD*this.vrmLookAt.pitch;this._meshPitch.geometry.theta=n,this._meshPitch.geometry.update(),this.vrmLookAt.getLookAtWorldPosition(de),this.vrmLookAt.getLookAtWorldQuaternion(xe),xe.multiply(this.vrmLookAt.getFaceFrontQuaternion($t)),this._meshYaw.position.copy(de),this._meshYaw.quaternion.copy(xe),this._meshPitch.position.copy(de),this._meshPitch.quaternion.copy(xe),this._meshPitch.quaternion.multiply($t.setFromAxisAngle(Hi,t)),this._meshPitch.quaternion.multiply(Bi);const{target:i,autoUpdate:r}=this.vrmLookAt;i!=null&&r&&(i.getWorldPosition(Jt).sub(de),this._lineTarget.geometry.tail.copy(Jt),this._lineTarget.geometry.update(),this._lineTarget.position.copy(de)),super.updateMatrixWorld(e)}},ki=new m,zi=new m;function je(e,t){return e.matrixWorld.decompose(ki,t,zi),t}function Te(e){return[Math.atan2(-e.z,e.x),Math.atan2(e.y,Math.sqrt(e.x*e.x+e.z*e.z))]}function en(e){const t=Math.round(e/2/Math.PI);return e-2*Math.PI*t}var tn=new m(0,0,1),Xi=new m,ji=new m,Gi=new m,Yi=new R,be=new R,nn=new R,qi=new R,Ne=new Qe,Ln=class On{constructor(t,n){this.offsetFromHeadBone=new m,this.autoUpdate=!0,this.faceFront=new m(0,0,1),this.humanoid=t,this.applier=n,this._yaw=0,this._pitch=0,this._needsUpdate=!0,this._restHeadWorldQuaternion=this.getLookAtWorldQuaternion(new R)}get yaw(){return this._yaw}set yaw(t){this._yaw=t,this._needsUpdate=!0}get pitch(){return this._pitch}set pitch(t){this._pitch=t,this._needsUpdate=!0}get euler(){return console.warn("VRMLookAt: euler is deprecated. use getEuler() instead."),this.getEuler(new Qe)}getEuler(t){return t.set(I.DEG2RAD*this._pitch,I.DEG2RAD*this._yaw,0,"YXZ")}copy(t){if(this.humanoid!==t.humanoid)throw new Error("VRMLookAt: humanoid must be same in order to copy");return this.offsetFromHeadBone.copy(t.offsetFromHeadBone),this.applier=t.applier,this.autoUpdate=t.autoUpdate,this.target=t.target,this.faceFront.copy(t.faceFront),this}clone(){return new On(this.humanoid,this.applier).copy(this)}reset(){this._yaw=0,this._pitch=0,this._needsUpdate=!0}getLookAtWorldPosition(t){const n=this.humanoid.getRawBoneNode("head");return t.copy(this.offsetFromHeadBone).applyMatrix4(n.matrixWorld)}getLookAtWorldQuaternion(t){const n=this.humanoid.getRawBoneNode("head");return je(n,t)}getFaceFrontQuaternion(t){if(this.faceFront.distanceToSquared(tn)<.01)return t.copy(this._restHeadWorldQuaternion).invert();const[n,i]=Te(this.faceFront);return Ne.set(0,.5*Math.PI+n,i,"YZX"),t.setFromEuler(Ne).premultiply(qi.copy(this._restHeadWorldQuaternion).invert())}getLookAtWorldDirection(t){return this.getLookAtWorldQuaternion(be),this.getFaceFrontQuaternion(nn),t.copy(tn).applyQuaternion(be).applyQuaternion(nn).applyEuler(this.getEuler(Ne))}lookAt(t){const n=Yi.copy(this._restHeadWorldQuaternion).multiply(En(this.getLookAtWorldQuaternion(be))),i=this.getLookAtWorldPosition(ji),r=Gi.copy(t).sub(i).applyQuaternion(n).normalize(),[o,a]=Te(this.faceFront),[l,s]=Te(r),u=en(l-o),d=en(a-s);this._yaw=I.RAD2DEG*u,this._pitch=I.RAD2DEG*d,this._needsUpdate=!0}update(t){this.target!=null&&this.autoUpdate&&this.lookAt(this.target.getWorldPosition(Xi)),this._needsUpdate&&(this._needsUpdate=!1,this.applier.applyYawPitch(this._yaw,this._pitch))}};Ln.EULER_ORDER="YXZ";var Qi=Ln,Zi=new m(0,0,1),F=new R,K=new R,N=new Qe(0,0,0,"YXZ"),we=class{constructor(e,t,n,i,r){this.humanoid=e,this.rangeMapHorizontalInner=t,this.rangeMapHorizontalOuter=n,this.rangeMapVerticalDown=i,this.rangeMapVerticalUp=r,this.faceFront=new m(0,0,1),this._restQuatLeftEye=new R,this._restQuatRightEye=new R,this._restLeftEyeParentWorldQuat=new R,this._restRightEyeParentWorldQuat=new R;const o=this.humanoid.getRawBoneNode("leftEye"),a=this.humanoid.getRawBoneNode("rightEye");o&&(this._restQuatLeftEye.copy(o.quaternion),je(o.parent,this._restLeftEyeParentWorldQuat)),a&&(this._restQuatRightEye.copy(a.quaternion),je(a.parent,this._restRightEyeParentWorldQuat))}applyYawPitch(e,t){const n=this.humanoid.getRawBoneNode("leftEye"),i=this.humanoid.getRawBoneNode("rightEye"),r=this.humanoid.getNormalizedBoneNode("leftEye"),o=this.humanoid.getNormalizedBoneNode("rightEye");n&&(t<0?N.x=-I.DEG2RAD*this.rangeMapVerticalDown.map(-t):N.x=I.DEG2RAD*this.rangeMapVerticalUp.map(t),e<0?N.y=-I.DEG2RAD*this.rangeMapHorizontalInner.map(-e):N.y=I.DEG2RAD*this.rangeMapHorizontalOuter.map(e),F.setFromEuler(N),this._getWorldFaceFrontQuat(K),r.quaternion.copy(K).multiply(F).multiply(K.invert()),F.copy(this._restLeftEyeParentWorldQuat),n.quaternion.copy(r.quaternion).multiply(F).premultiply(F.invert()).multiply(this._restQuatLeftEye)),i&&(t<0?N.x=-I.DEG2RAD*this.rangeMapVerticalDown.map(-t):N.x=I.DEG2RAD*this.rangeMapVerticalUp.map(t),e<0?N.y=-I.DEG2RAD*this.rangeMapHorizontalOuter.map(-e):N.y=I.DEG2RAD*this.rangeMapHorizontalInner.map(e),F.setFromEuler(N),this._getWorldFaceFrontQuat(K),o.quaternion.copy(K).multiply(F).multiply(K.invert()),F.copy(this._restRightEyeParentWorldQuat),i.quaternion.copy(o.quaternion).multiply(F).premultiply(F.invert()).multiply(this._restQuatRightEye))}lookAt(e){console.warn("VRMLookAtBoneApplier: lookAt() is deprecated. use apply() instead.");const t=I.RAD2DEG*e.y,n=I.RAD2DEG*e.x;this.applyYawPitch(t,n)}_getWorldFaceFrontQuat(e){if(this.faceFront.distanceToSquared(Zi)<.01)return e.identity();const[t,n]=Te(this.faceFront);return N.set(0,.5*Math.PI+t,n,"YZX"),e.setFromEuler(N)}};we.type="bone";var Ge=class{constructor(e,t,n,i,r){this.expressions=e,this.rangeMapHorizontalInner=t,this.rangeMapHorizontalOuter=n,this.rangeMapVerticalDown=i,this.rangeMapVerticalUp=r}applyYawPitch(e,t){t<0?(this.expressions.setValue("lookDown",0),this.expressions.setValue("lookUp",this.rangeMapVerticalUp.map(-t))):(this.expressions.setValue("lookUp",0),this.expressions.setValue("lookDown",this.rangeMapVerticalDown.map(t))),e<0?(this.expressions.setValue("lookLeft",0),this.expressions.setValue("lookRight",this.rangeMapHorizontalOuter.map(-e))):(this.expressions.setValue("lookRight",0),this.expressions.setValue("lookLeft",this.rangeMapHorizontalOuter.map(e)))}lookAt(e){console.warn("VRMLookAtBoneApplier: lookAt() is deprecated. use apply() instead.");const t=I.RAD2DEG*e.y,n=I.RAD2DEG*e.x;this.applyYawPitch(t,n)}};Ge.type="expression";var rn=class{constructor(e,t){this.inputMaxValue=e,this.outputScale=t}map(e){return this.outputScale*gn(e/this.inputMaxValue)}},$i=new Set(["1.0","1.0-beta"]),ye=.01,Ji=class{get name(){return"VRMLookAtLoaderPlugin"}constructor(e,t){this.parser=e,this.helperRoot=t?.helperRoot}afterRoot(e){return T(this,null,function*(){const t=e.userData.vrmHumanoid;if(t===null)return;if(t===void 0)throw new Error("VRMLookAtLoaderPlugin: vrmHumanoid is undefined. VRMHumanoidLoaderPlugin have to be used first");const n=e.userData.vrmExpressionManager;if(n!==null){if(n===void 0)throw new Error("VRMLookAtLoaderPlugin: vrmExpressionManager is undefined. VRMExpressionLoaderPlugin have to be used first");e.userData.vrmLookAt=yield this._import(e,t,n)}})}_import(e,t,n){return T(this,null,function*(){if(t==null||n==null)return null;const i=yield this._v1Import(e,t,n);if(i)return i;const r=yield this._v0Import(e,t,n);return r||null})}_v1Import(e,t,n){return T(this,null,function*(){var i,r,o;const a=this.parser.json;if(!(((i=a.extensionsUsed)==null?void 0:i.indexOf("VRMC_vrm"))!==-1))return null;const s=(r=a.extensions)==null?void 0:r.VRMC_vrm;if(!s)return null;const u=s.specVersion;if(!$i.has(u))return console.warn(`VRMLookAtLoaderPlugin: Unknown VRMC_vrm specVersion "${u}"`),null;const d=s.lookAt;if(!d)return null;const h=d.type==="expression"?1:10,f=this._v1ImportRangeMap(d.rangeMapHorizontalInner,h),c=this._v1ImportRangeMap(d.rangeMapHorizontalOuter,h),_=this._v1ImportRangeMap(d.rangeMapVerticalDown,h),p=this._v1ImportRangeMap(d.rangeMapVerticalUp,h);let v;d.type==="expression"?v=new Ge(n,f,c,_,p):v=new we(t,f,c,_,p);const g=this._importLookAt(t,v);return g.offsetFromHeadBone.fromArray((o=d.offsetFromHeadBone)!=null?o:[0,.06,0]),g})}_v1ImportRangeMap(e,t){var n,i;let r=(n=e?.inputMaxValue)!=null?n:90;const o=(i=e?.outputScale)!=null?i:t;return r<ye&&(console.warn("VRMLookAtLoaderPlugin: inputMaxValue of a range map is too small. Consider reviewing the range map!"),r=ye),new rn(r,o)}_v0Import(e,t,n){return T(this,null,function*(){var i,r,o,a;const s=(i=this.parser.json.extensions)==null?void 0:i.VRM;if(!s)return null;const u=s.firstPerson;if(!u)return null;const d=u.lookAtTypeName==="BlendShape"?1:10,h=this._v0ImportDegreeMap(u.lookAtHorizontalInner,d),f=this._v0ImportDegreeMap(u.lookAtHorizontalOuter,d),c=this._v0ImportDegreeMap(u.lookAtVerticalDown,d),_=this._v0ImportDegreeMap(u.lookAtVerticalUp,d);let p;u.lookAtTypeName==="BlendShape"?p=new Ge(n,h,f,c,_):p=new we(t,h,f,c,_);const v=this._importLookAt(t,p);return u.firstPersonBoneOffset?v.offsetFromHeadBone.set((r=u.firstPersonBoneOffset.x)!=null?r:0,(o=u.firstPersonBoneOffset.y)!=null?o:.06,-((a=u.firstPersonBoneOffset.z)!=null?a:0)):v.offsetFromHeadBone.set(0,.06,0),v.faceFront.set(0,0,-1),p instanceof we&&p.faceFront.set(0,0,-1),v})}_v0ImportDegreeMap(e,t){var n,i;const r=e?.curve;JSON.stringify(r)!=="[0,0,0,1,1,1,1,0]"&&console.warn("Curves of LookAtDegreeMap defined in VRM 0.0 are not supported");let o=(n=e?.xRange)!=null?n:90;const a=(i=e?.yRange)!=null?i:t;return o<ye&&(console.warn("VRMLookAtLoaderPlugin: xRange of a degree map is too small. Consider reviewing the degree map!"),o=ye),new rn(o,a)}_importLookAt(e,t){const n=new Qi(e,t);if(this.helperRoot){const i=new Wi(n);this.helperRoot.add(i),i.renderOrder=this.helperRoot.renderOrder}return n}};function Ki(e,t){return typeof e!="string"||e===""?"":(/^https?:\/\//i.test(t)&&/^\//.test(e)&&(t=t.replace(/(^https?:\/\/[^/]+).*/i,"$1")),/^(https?:)?\/\//i.test(e)||/^data:.*,.*$/i.test(e)||/^blob:.*$/i.test(e)?e:t+e)}var er=new Set(["1.0","1.0-beta"]),tr=class{get name(){return"VRMMetaLoaderPlugin"}constructor(e,t){var n,i,r;this.parser=e,this.needThumbnailImage=(n=t?.needThumbnailImage)!=null?n:!1,this.acceptLicenseUrls=(i=t?.acceptLicenseUrls)!=null?i:["https://vrm.dev/licenses/1.0/"],this.acceptV0Meta=(r=t?.acceptV0Meta)!=null?r:!0}afterRoot(e){return T(this,null,function*(){e.userData.vrmMeta=yield this._import(e)})}_import(e){return T(this,null,function*(){const t=yield this._v1Import(e);if(t!=null)return t;const n=yield this._v0Import(e);return n??null})}_v1Import(e){return T(this,null,function*(){var t,n,i;const r=this.parser.json;if(!(((t=r.extensionsUsed)==null?void 0:t.indexOf("VRMC_vrm"))!==-1))return null;const a=(n=r.extensions)==null?void 0:n.VRMC_vrm;if(a==null)return null;const l=a.specVersion;if(!er.has(l))return console.warn(`VRMMetaLoaderPlugin: Unknown VRMC_vrm specVersion "${l}"`),null;const s=a.meta;if(!s)return null;const u=s.licenseUrl;if(!new Set(this.acceptLicenseUrls).has(u))throw new Error(`VRMMetaLoaderPlugin: The license url "${u}" is not accepted`);let h;return this.needThumbnailImage&&s.thumbnailImage!=null&&(h=(i=yield this._extractGLTFImage(s.thumbnailImage))!=null?i:void 0),{metaVersion:"1",name:s.name,version:s.version,authors:s.authors,copyrightInformation:s.copyrightInformation,contactInformation:s.contactInformation,references:s.references,thirdPartyLicenses:s.thirdPartyLicenses,thumbnailImage:h,licenseUrl:s.licenseUrl,avatarPermission:s.avatarPermission,allowExcessivelyViolentUsage:s.allowExcessivelyViolentUsage,allowExcessivelySexualUsage:s.allowExcessivelySexualUsage,commercialUsage:s.commercialUsage,allowPoliticalOrReligiousUsage:s.allowPoliticalOrReligiousUsage,allowAntisocialOrHateUsage:s.allowAntisocialOrHateUsage,creditNotation:s.creditNotation,allowRedistribution:s.allowRedistribution,modification:s.modification,otherLicenseUrl:s.otherLicenseUrl}})}_v0Import(e){return T(this,null,function*(){var t;const i=(t=this.parser.json.extensions)==null?void 0:t.VRM;if(!i)return null;const r=i.meta;if(!r)return null;if(!this.acceptV0Meta)throw new Error("VRMMetaLoaderPlugin: Attempted to load VRM0.0 meta but acceptV0Meta is false");let o;return this.needThumbnailImage&&r.texture!=null&&r.texture!==-1&&(o=yield this.parser.getDependency("texture",r.texture)),{metaVersion:"0",allowedUserName:r.allowedUserName,author:r.author,commercialUssageName:r.commercialUssageName,contactInformation:r.contactInformation,licenseName:r.licenseName,otherLicenseUrl:r.otherLicenseUrl,otherPermissionUrl:r.otherPermissionUrl,reference:r.reference,sexualUssageName:r.sexualUssageName,texture:o??void 0,title:r.title,version:r.version,violentUssageName:r.violentUssageName}})}_extractGLTFImage(e){return T(this,null,function*(){var t;const i=(t=this.parser.json.images)==null?void 0:t[e];if(i==null)return console.warn(`VRMMetaLoaderPlugin: Attempt to use images[${e}] of glTF as a thumbnail but the image doesn't exist`),null;let r=i.uri;if(i.bufferView!=null){const a=yield this.parser.getDependency("bufferView",i.bufferView),l=new Blob([a],{type:i.mimeType});r=URL.createObjectURL(l)}return r==null?(console.warn(`VRMMetaLoaderPlugin: Attempt to use images[${e}] of glTF as a thumbnail but the image couldn't load properly`),null):yield new _i().loadAsync(Ki(r,this.parser.options.path)).catch(a=>(console.error(a),console.warn("VRMMetaLoaderPlugin: Failed to load a thumbnail image"),null))})}},nr=class{constructor(e){this.scene=e.scene,this.meta=e.meta,this.humanoid=e.humanoid,this.expressionManager=e.expressionManager,this.firstPerson=e.firstPerson,this.lookAt=e.lookAt}update(e){this.humanoid.update(),this.lookAt&&this.lookAt.update(e),this.expressionManager&&this.expressionManager.update()}},ir=class extends nr{constructor(e){super(e),this.materials=e.materials,this.springBoneManager=e.springBoneManager,this.nodeConstraintManager=e.nodeConstraintManager}update(e){super.update(e),this.nodeConstraintManager&&this.nodeConstraintManager.update(),this.springBoneManager&&this.springBoneManager.update(e),this.materials&&this.materials.forEach(t=>{t.update&&t.update(e)})}},rr=Object.defineProperty,on=Object.getOwnPropertySymbols,or=Object.prototype.hasOwnProperty,sr=Object.prototype.propertyIsEnumerable,sn=(e,t,n)=>t in e?rr(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,an=(e,t)=>{for(var n in t||(t={}))or.call(t,n)&&sn(e,n,t[n]);if(on)for(var n of on(t))sr.call(t,n)&&sn(e,n,t[n]);return e},Q=(e,t,n)=>new Promise((i,r)=>{var o=s=>{try{l(n.next(s))}catch(u){r(u)}},a=s=>{try{l(n.throw(s))}catch(u){r(u)}},l=s=>s.done?i(s.value):Promise.resolve(s.value).then(o,a);l((n=n.apply(e,t)).next())}),ar={"":3e3,srgb:3001};function lr(e,t){parseInt(Pe,10)>=152?e.colorSpace=t:e.encoding=ar[t]}var ur=class{get pending(){return Promise.all(this._pendings)}constructor(e,t){this._parser=e,this._materialParams=t,this._pendings=[]}assignPrimitive(e,t){t!=null&&(this._materialParams[e]=t)}assignColor(e,t,n){if(t!=null){const i=new V().fromArray(t);n&&i.convertSRGBToLinear(),this._materialParams[e]=i}}assignTexture(e,t,n){return Q(this,null,function*(){const i=Q(this,null,function*(){t!=null&&(yield this._parser.assignTexture(this._materialParams,e,t),n&&lr(this._materialParams[e],"srgb"))});return this._pendings.push(i),i})}assignTextureByIndex(e,t,n){return Q(this,null,function*(){return this.assignTexture(e,t!=null?{index:t}:void 0,n)})}},dr=`// #define PHONG

varying vec3 vViewPosition;

#ifndef FLAT_SHADED
  varying vec3 vNormal;
#endif

#include <common>

// #include <uv_pars_vertex>
#ifdef MTOON_USE_UV
  varying vec2 vUv;

  // COMPAT: pre-r151 uses a common uvTransform
  #if THREE_VRM_THREE_REVISION < 151
    uniform mat3 uvTransform;
  #endif
#endif

// #include <uv2_pars_vertex>
// COMAPT: pre-r151 uses uv2 for lightMap and aoMap
#if THREE_VRM_THREE_REVISION < 151
  #if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
    attribute vec2 uv2;
    varying vec2 vUv2;
    uniform mat3 uv2Transform;
  #endif
#endif

// #include <displacementmap_pars_vertex>
// #include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

#ifdef USE_OUTLINEWIDTHMULTIPLYTEXTURE
  uniform sampler2D outlineWidthMultiplyTexture;
  uniform mat3 outlineWidthMultiplyTextureUvTransform;
#endif

uniform float outlineWidthFactor;

void main() {

  // #include <uv_vertex>
  #ifdef MTOON_USE_UV
    // COMPAT: pre-r151 uses a common uvTransform
    #if THREE_VRM_THREE_REVISION >= 151
      vUv = uv;
    #else
      vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
    #endif
  #endif

  // #include <uv2_vertex>
  // COMAPT: pre-r151 uses uv2 for lightMap and aoMap
  #if THREE_VRM_THREE_REVISION < 151
    #if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
      vUv2 = ( uv2Transform * vec3( uv2, 1 ) ).xy;
    #endif
  #endif

  #include <color_vertex>

  #include <beginnormal_vertex>
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>

  // we need this to compute the outline properly
  objectNormal = normalize( objectNormal );

  #include <defaultnormal_vertex>

  #ifndef FLAT_SHADED // Normal computed with derivatives when FLAT_SHADED
    vNormal = normalize( transformedNormal );
  #endif

  #include <begin_vertex>

  #include <morphtarget_vertex>
  #include <skinning_vertex>
  // #include <displacementmap_vertex>
  #include <project_vertex>
  #include <logdepthbuf_vertex>
  #include <clipping_planes_vertex>

  vViewPosition = - mvPosition.xyz;

  #ifdef OUTLINE
    float worldNormalLength = length( transformedNormal );
    vec3 outlineOffset = outlineWidthFactor * worldNormalLength * objectNormal;

    #ifdef USE_OUTLINEWIDTHMULTIPLYTEXTURE
      vec2 outlineWidthMultiplyTextureUv = ( outlineWidthMultiplyTextureUvTransform * vec3( vUv, 1 ) ).xy;
      float outlineTex = texture2D( outlineWidthMultiplyTexture, outlineWidthMultiplyTextureUv ).g;
      outlineOffset *= outlineTex;
    #endif

    #ifdef OUTLINE_WIDTH_SCREEN
      outlineOffset *= vViewPosition.z / projectionMatrix[ 1 ].y;
    #endif

    gl_Position = projectionMatrix * modelViewMatrix * vec4( outlineOffset + transformed, 1.0 );

    gl_Position.z += 1E-6 * gl_Position.w; // anti-artifact magic
  #endif

  #include <worldpos_vertex>
  // #include <envmap_vertex>
  #include <shadowmap_vertex>
  #include <fog_vertex>

}`,hr=`// #define PHONG

uniform vec3 litFactor;

uniform float opacity;

uniform vec3 shadeColorFactor;
#ifdef USE_SHADEMULTIPLYTEXTURE
  uniform sampler2D shadeMultiplyTexture;
  uniform mat3 shadeMultiplyTextureUvTransform;
#endif

uniform float shadingShiftFactor;
uniform float shadingToonyFactor;

#ifdef USE_SHADINGSHIFTTEXTURE
  uniform sampler2D shadingShiftTexture;
  uniform mat3 shadingShiftTextureUvTransform;
  uniform float shadingShiftTextureScale;
#endif

uniform float giEqualizationFactor;

uniform vec3 parametricRimColorFactor;
#ifdef USE_RIMMULTIPLYTEXTURE
  uniform sampler2D rimMultiplyTexture;
  uniform mat3 rimMultiplyTextureUvTransform;
#endif
uniform float rimLightingMixFactor;
uniform float parametricRimFresnelPowerFactor;
uniform float parametricRimLiftFactor;

#ifdef USE_MATCAPTEXTURE
  uniform vec3 matcapFactor;
  uniform sampler2D matcapTexture;
  uniform mat3 matcapTextureUvTransform;
#endif

uniform vec3 emissive;
uniform float emissiveIntensity;

uniform vec3 outlineColorFactor;
uniform float outlineLightingMixFactor;

#ifdef USE_UVANIMATIONMASKTEXTURE
  uniform sampler2D uvAnimationMaskTexture;
  uniform mat3 uvAnimationMaskTextureUvTransform;
#endif

uniform float uvAnimationScrollXOffset;
uniform float uvAnimationScrollYOffset;
uniform float uvAnimationRotationPhase;

#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>

// #include <uv_pars_fragment>
#if ( defined( MTOON_USE_UV ) && !defined( MTOON_UVS_VERTEX_ONLY ) )
  varying vec2 vUv;
#endif

// #include <uv2_pars_fragment>
// COMAPT: pre-r151 uses uv2 for lightMap and aoMap
#if THREE_VRM_THREE_REVISION < 151
  #if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
    varying vec2 vUv2;
  #endif
#endif

#include <map_pars_fragment>

#ifdef USE_MAP
  uniform mat3 mapUvTransform;
#endif

// #include <alphamap_pars_fragment>

#include <alphatest_pars_fragment>

#include <aomap_pars_fragment>
// #include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>

#ifdef USE_EMISSIVEMAP
  uniform mat3 emissiveMapUvTransform;
#endif

// #include <envmap_common_pars_fragment>
// #include <envmap_pars_fragment>
// #include <cube_uv_reflection_fragment>
#include <fog_pars_fragment>

// #include <bsdfs>
// COMPAT: pre-r151 doesn't have BRDF_Lambert in <common>
#if THREE_VRM_THREE_REVISION < 151
  vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
    return RECIPROCAL_PI * diffuseColor;
  }
#endif

#include <lights_pars_begin>

#include <normal_pars_fragment>

// #include <lights_phong_pars_fragment>
varying vec3 vViewPosition;

struct MToonMaterial {
  vec3 diffuseColor;
  vec3 shadeColor;
  float shadingShift;
};

float linearstep( float a, float b, float t ) {
  return clamp( ( t - a ) / ( b - a ), 0.0, 1.0 );
}

/**
 * Convert NdotL into toon shading factor using shadingShift and shadingToony
 */
float getShading(
  const in float dotNL,
  const in float shadow,
  const in float shadingShift
) {
  float shading = dotNL;
  shading = shading + shadingShift;
  shading = linearstep( -1.0 + shadingToonyFactor, 1.0 - shadingToonyFactor, shading );
  shading *= shadow;
  return shading;
}

/**
 * Mix diffuseColor and shadeColor using shading factor and light color
 */
vec3 getDiffuse(
  const in MToonMaterial material,
  const in float shading,
  in vec3 lightColor
) {
  #ifdef DEBUG_LITSHADERATE
    return vec3( BRDF_Lambert( shading * lightColor ) );
  #endif

  vec3 col = lightColor * BRDF_Lambert( mix( material.shadeColor, material.diffuseColor, shading ) );

  // The "comment out if you want to PBR absolutely" line
  #ifdef V0_COMPAT_SHADE
    col = min( col, material.diffuseColor );
  #endif

  return col;
}

// COMPAT: pre-r156 uses a struct GeometricContext
#if THREE_VRM_THREE_REVISION >= 157
  void RE_Direct_MToon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in MToonMaterial material, const in float shadow, inout ReflectedLight reflectedLight ) {
    float dotNL = clamp( dot( geometryNormal, directLight.direction ), -1.0, 1.0 );
    vec3 irradiance = directLight.color;

    // directSpecular will be used for rim lighting, not an actual specular
    reflectedLight.directSpecular += irradiance;

    irradiance *= dotNL;

    float shading = getShading( dotNL, shadow, material.shadingShift );

    // toon shaded diffuse
    reflectedLight.directDiffuse += getDiffuse( material, shading, directLight.color );
  }

  void RE_IndirectDiffuse_MToon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in MToonMaterial material, inout ReflectedLight reflectedLight ) {
    // indirect diffuse will use diffuseColor, no shadeColor involved
    reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );

    // directSpecular will be used for rim lighting, not an actual specular
    reflectedLight.directSpecular += irradiance;
  }
#else
  void RE_Direct_MToon( const in IncidentLight directLight, const in GeometricContext geometry, const in MToonMaterial material, const in float shadow, inout ReflectedLight reflectedLight ) {
    float dotNL = clamp( dot( geometry.normal, directLight.direction ), -1.0, 1.0 );
    vec3 irradiance = directLight.color;

    // directSpecular will be used for rim lighting, not an actual specular
    reflectedLight.directSpecular += irradiance;

    irradiance *= dotNL;

    float shading = getShading( dotNL, shadow, material.shadingShift );

    // toon shaded diffuse
    reflectedLight.directDiffuse += getDiffuse( material, shading, directLight.color );
  }

  void RE_IndirectDiffuse_MToon( const in vec3 irradiance, const in GeometricContext geometry, const in MToonMaterial material, inout ReflectedLight reflectedLight ) {
    // indirect diffuse will use diffuseColor, no shadeColor involved
    reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );

    // directSpecular will be used for rim lighting, not an actual specular
    reflectedLight.directSpecular += irradiance;
  }
#endif

#define RE_Direct RE_Direct_MToon
#define RE_IndirectDiffuse RE_IndirectDiffuse_MToon
#define Material_LightProbeLOD( material ) (0)

#include <shadowmap_pars_fragment>
// #include <bumpmap_pars_fragment>

// #include <normalmap_pars_fragment>
#ifdef USE_NORMALMAP

  uniform sampler2D normalMap;
  uniform mat3 normalMapUvTransform;
  uniform vec2 normalScale;

#endif

// COMPAT: pre-r151
// USE_NORMALMAP_OBJECTSPACE used to be OBJECTSPACE_NORMALMAP in pre-r151
#if defined( USE_NORMALMAP_OBJECTSPACE ) || defined( OBJECTSPACE_NORMALMAP )

  uniform mat3 normalMatrix;

#endif

// COMPAT: pre-r151
// USE_NORMALMAP_TANGENTSPACE used to be TANGENTSPACE_NORMALMAP in pre-r151
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( TANGENTSPACE_NORMALMAP ) )

  // Per-Pixel Tangent Space Normal Mapping
  // http://hacksoflife.blogspot.ch/2009/11/per-pixel-tangent-space-normal-mapping.html

  // three-vrm specific change: it requires \`uv\` as an input in order to support uv scrolls

  // Temporary compat against shader change @ Three.js r126, r151
  #if THREE_VRM_THREE_REVISION >= 151

    mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {

      vec3 q0 = dFdx( eye_pos.xyz );
      vec3 q1 = dFdy( eye_pos.xyz );
      vec2 st0 = dFdx( uv.st );
      vec2 st1 = dFdy( uv.st );

      vec3 N = surf_norm;

      vec3 q1perp = cross( q1, N );
      vec3 q0perp = cross( N, q0 );

      vec3 T = q1perp * st0.x + q0perp * st1.x;
      vec3 B = q1perp * st0.y + q0perp * st1.y;

      float det = max( dot( T, T ), dot( B, B ) );
      float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );

      return mat3( T * scale, B * scale, N );

    }

  #else

    vec3 perturbNormal2Arb( vec2 uv, vec3 eye_pos, vec3 surf_norm, vec3 mapN, float faceDirection ) {

      vec3 q0 = vec3( dFdx( eye_pos.x ), dFdx( eye_pos.y ), dFdx( eye_pos.z ) );
      vec3 q1 = vec3( dFdy( eye_pos.x ), dFdy( eye_pos.y ), dFdy( eye_pos.z ) );
      vec2 st0 = dFdx( uv.st );
      vec2 st1 = dFdy( uv.st );

      vec3 N = normalize( surf_norm );

      vec3 q1perp = cross( q1, N );
      vec3 q0perp = cross( N, q0 );

      vec3 T = q1perp * st0.x + q0perp * st1.x;
      vec3 B = q1perp * st0.y + q0perp * st1.y;

      // three-vrm specific change: Workaround for the issue that happens when delta of uv = 0.0
      // TODO: Is this still required? Or shall I make a PR about it?
      if ( length( T ) == 0.0 || length( B ) == 0.0 ) {
        return surf_norm;
      }

      float det = max( dot( T, T ), dot( B, B ) );
      float scale = ( det == 0.0 ) ? 0.0 : faceDirection * inversesqrt( det );

      return normalize( T * ( mapN.x * scale ) + B * ( mapN.y * scale ) + N * mapN.z );

    }

  #endif

#endif

// #include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

// == post correction ==========================================================
void postCorrection() {
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
  #include <premultiplied_alpha_fragment>
  #include <dithering_fragment>
}

// == main procedure ===========================================================
void main() {
  #include <clipping_planes_fragment>

  vec2 uv = vec2(0.5, 0.5);

  #if ( defined( MTOON_USE_UV ) && !defined( MTOON_UVS_VERTEX_ONLY ) )
    uv = vUv;

    float uvAnimMask = 1.0;
    #ifdef USE_UVANIMATIONMASKTEXTURE
      vec2 uvAnimationMaskTextureUv = ( uvAnimationMaskTextureUvTransform * vec3( uv, 1 ) ).xy;
      uvAnimMask = texture2D( uvAnimationMaskTexture, uvAnimationMaskTextureUv ).b;
    #endif

    float uvRotCos = cos( uvAnimationRotationPhase * uvAnimMask );
    float uvRotSin = sin( uvAnimationRotationPhase * uvAnimMask );
    uv = mat2( uvRotCos, -uvRotSin, uvRotSin, uvRotCos ) * ( uv - 0.5 ) + 0.5;
    uv = uv + vec2( uvAnimationScrollXOffset, uvAnimationScrollYOffset ) * uvAnimMask;
  #endif

  #ifdef DEBUG_UV
    gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
    #if ( defined( MTOON_USE_UV ) && !defined( MTOON_UVS_VERTEX_ONLY ) )
      gl_FragColor = vec4( uv, 0.0, 1.0 );
    #endif
    return;
  #endif

  vec4 diffuseColor = vec4( litFactor, opacity );
  ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
  vec3 totalEmissiveRadiance = emissive * emissiveIntensity;

  #include <logdepthbuf_fragment>

  // #include <map_fragment>
  #ifdef USE_MAP
    vec2 mapUv = ( mapUvTransform * vec3( uv, 1 ) ).xy;
    vec4 sampledDiffuseColor = texture2D( map, mapUv );
    #ifdef DECODE_VIDEO_TEXTURE
      sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
    #endif
    diffuseColor *= sampledDiffuseColor;
  #endif

  // #include <color_fragment>
  #if ( defined( USE_COLOR ) && !defined( IGNORE_VERTEX_COLOR ) )
    diffuseColor.rgb *= vColor;
  #endif

  // #include <alphamap_fragment>

  #include <alphatest_fragment>

  // #include <specularmap_fragment>

  // #include <normal_fragment_begin>
  float faceDirection = gl_FrontFacing ? 1.0 : -1.0;

  #ifdef FLAT_SHADED

    vec3 fdx = dFdx( vViewPosition );
    vec3 fdy = dFdy( vViewPosition );
    vec3 normal = normalize( cross( fdx, fdy ) );

  #else

    vec3 normal = normalize( vNormal );

    #ifdef DOUBLE_SIDED

      normal *= faceDirection;

    #endif

  #endif

  #ifdef USE_NORMALMAP

    vec2 normalMapUv = ( normalMapUvTransform * vec3( uv, 1 ) ).xy;

  #endif

  #ifdef USE_NORMALMAP_TANGENTSPACE

    #ifdef USE_TANGENT

      mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );

    #else

      mat3 tbn = getTangentFrame( - vViewPosition, normal, normalMapUv );

    #endif

    #if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )

      tbn[0] *= faceDirection;
      tbn[1] *= faceDirection;

    #endif

  #endif

  #ifdef USE_CLEARCOAT_NORMALMAP

    #ifdef USE_TANGENT

      mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );

    #else

      mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );

    #endif

    #if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )

      tbn2[0] *= faceDirection;
      tbn2[1] *= faceDirection;

    #endif

  #endif

  // non perturbed normal for clearcoat among others

  vec3 nonPerturbedNormal = normal;

  #ifdef OUTLINE
    normal *= -1.0;
  #endif

  // #include <normal_fragment_maps>

  // COMPAT: pre-r151
  // USE_NORMALMAP_OBJECTSPACE used to be OBJECTSPACE_NORMALMAP in pre-r151
  #if defined( USE_NORMALMAP_OBJECTSPACE ) || defined( OBJECTSPACE_NORMALMAP )

    normal = texture2D( normalMap, normalMapUv ).xyz * 2.0 - 1.0; // overrides both flatShading and attribute normals

    #ifdef FLIP_SIDED

      normal = - normal;

    #endif

    #ifdef DOUBLE_SIDED

      normal = normal * faceDirection;

    #endif

    normal = normalize( normalMatrix * normal );

  // COMPAT: pre-r151
  // USE_NORMALMAP_TANGENTSPACE used to be TANGENTSPACE_NORMALMAP in pre-r151
  #elif defined( USE_NORMALMAP_TANGENTSPACE ) || defined( TANGENTSPACE_NORMALMAP )

    vec3 mapN = texture2D( normalMap, normalMapUv ).xyz * 2.0 - 1.0;
    mapN.xy *= normalScale;

    // COMPAT: pre-r151
    #if THREE_VRM_THREE_REVISION >= 151 || defined( USE_TANGENT )

      normal = normalize( tbn * mapN );

    #else

      normal = perturbNormal2Arb( uv, -vViewPosition, normal, mapN, faceDirection );

    #endif

  #endif

  // #include <emissivemap_fragment>
  #ifdef USE_EMISSIVEMAP
    vec2 emissiveMapUv = ( emissiveMapUvTransform * vec3( uv, 1 ) ).xy;
    totalEmissiveRadiance *= texture2D( emissiveMap, emissiveMapUv ).rgb;
  #endif

  #ifdef DEBUG_NORMAL
    gl_FragColor = vec4( 0.5 + 0.5 * normal, 1.0 );
    return;
  #endif

  // -- MToon: lighting --------------------------------------------------------
  // accumulation
  // #include <lights_phong_fragment>
  MToonMaterial material;

  material.diffuseColor = diffuseColor.rgb;

  material.shadeColor = shadeColorFactor;
  #ifdef USE_SHADEMULTIPLYTEXTURE
    vec2 shadeMultiplyTextureUv = ( shadeMultiplyTextureUvTransform * vec3( uv, 1 ) ).xy;
    material.shadeColor *= texture2D( shadeMultiplyTexture, shadeMultiplyTextureUv ).rgb;
  #endif

  #if ( defined( USE_COLOR ) && !defined( IGNORE_VERTEX_COLOR ) )
    material.shadeColor.rgb *= vColor;
  #endif

  material.shadingShift = shadingShiftFactor;
  #ifdef USE_SHADINGSHIFTTEXTURE
    vec2 shadingShiftTextureUv = ( shadingShiftTextureUvTransform * vec3( uv, 1 ) ).xy;
    material.shadingShift += texture2D( shadingShiftTexture, shadingShiftTextureUv ).r * shadingShiftTextureScale;
  #endif

  // #include <lights_fragment_begin>

  // MToon Specific changes:
  // Since we want to take shadows into account of shading instead of irradiance,
  // we had to modify the codes that multiplies the results of shadowmap into color of direct lights.

  // COMPAT: pre-r156 uses a struct GeometricContext
  #if THREE_VRM_THREE_REVISION >= 157
    vec3 geometryPosition = - vViewPosition;
    vec3 geometryNormal = normal;
    vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );

    vec3 geometryClearcoatNormal;

    #ifdef USE_CLEARCOAT

      geometryClearcoatNormal = clearcoatNormal;

    #endif
  #else
    GeometricContext geometry;

    geometry.position = - vViewPosition;
    geometry.normal = normal;
    geometry.viewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );

    #ifdef USE_CLEARCOAT

      geometry.clearcoatNormal = clearcoatNormal;

    #endif
  #endif

  IncidentLight directLight;

  // since these variables will be used in unrolled loop, we have to define in prior
  float shadow;

  #if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )

    PointLight pointLight;
    #if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
    PointLightShadow pointLightShadow;
    #endif

    #pragma unroll_loop_start
    for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {

      pointLight = pointLights[ i ];

      // COMPAT: pre-r156 uses a struct GeometricContext
      #if THREE_VRM_THREE_REVISION >= 157
        getPointLightInfo( pointLight, geometryPosition, directLight );
      #else
        getPointLightInfo( pointLight, geometry, directLight );
      #endif

      shadow = 1.0;
      #if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
      pointLightShadow = pointLightShadows[ i ];
      // COMPAT: pre-r166
      // r166 introduced shadowIntensity
      #if THREE_VRM_THREE_REVISION >= 166
        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
      #else
        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
      #endif
      #endif

      // COMPAT: pre-r156 uses a struct GeometricContext
      #if THREE_VRM_THREE_REVISION >= 157
        RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, shadow, reflectedLight );
      #else
        RE_Direct( directLight, geometry, material, shadow, reflectedLight );
      #endif

    }
    #pragma unroll_loop_end

  #endif

  #if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )

    SpotLight spotLight;
    // COMPAT: pre-r144 uses NUM_SPOT_LIGHT_SHADOWS, r144+ uses NUM_SPOT_LIGHT_COORDS
    #if THREE_VRM_THREE_REVISION >= 144
      #if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_COORDS > 0
      SpotLightShadow spotLightShadow;
      #endif
    #elif defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
    SpotLightShadow spotLightShadow;
    #endif

    #pragma unroll_loop_start
    for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {

      spotLight = spotLights[ i ];

      // COMPAT: pre-r156 uses a struct GeometricContext
      #if THREE_VRM_THREE_REVISION >= 157
        getSpotLightInfo( spotLight, geometryPosition, directLight );
      #else
        getSpotLightInfo( spotLight, geometry, directLight );
      #endif

      shadow = 1.0;
      // COMPAT: pre-r144 uses NUM_SPOT_LIGHT_SHADOWS and vSpotShadowCoord, r144+ uses NUM_SPOT_LIGHT_COORDS and vSpotLightCoord
      // COMPAT: pre-r166 does not have shadowIntensity, r166+ has shadowIntensity
      #if THREE_VRM_THREE_REVISION >= 166
        #if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_COORDS )
        spotLightShadow = spotLightShadows[ i ];
        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
        #endif
      #elif THREE_VRM_THREE_REVISION >= 144
        #if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_COORDS )
        spotLightShadow = spotLightShadows[ i ];
        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
        #endif
      #elif defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
      spotLightShadow = spotLightShadows[ i ];
      shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotShadowCoord[ i ] ) : 1.0;
      #endif

      // COMPAT: pre-r156 uses a struct GeometricContext
      #if THREE_VRM_THREE_REVISION >= 157
        RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, shadow, reflectedLight );
      #else
        RE_Direct( directLight, geometry, material, shadow, reflectedLight );
      #endif

    }
    #pragma unroll_loop_end

  #endif

  #if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )

    DirectionalLight directionalLight;
    #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
    DirectionalLightShadow directionalLightShadow;
    #endif

    #pragma unroll_loop_start
    for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {

      directionalLight = directionalLights[ i ];

      // COMPAT: pre-r156 uses a struct GeometricContext
      #if THREE_VRM_THREE_REVISION >= 157
        getDirectionalLightInfo( directionalLight, directLight );
      #else
        getDirectionalLightInfo( directionalLight, geometry, directLight );
      #endif

      shadow = 1.0;
      #if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
      directionalLightShadow = directionalLightShadows[ i ];
      // COMPAT: pre-r166
      // r166 introduced shadowIntensity
      #if THREE_VRM_THREE_REVISION >= 166
        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
      #else
        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
      #endif
      #endif

      // COMPAT: pre-r156 uses a struct GeometricContext
      #if THREE_VRM_THREE_REVISION >= 157
        RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, shadow, reflectedLight );
      #else
        RE_Direct( directLight, geometry, material, shadow, reflectedLight );
      #endif

    }
    #pragma unroll_loop_end

  #endif

  // #if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )

  //   RectAreaLight rectAreaLight;

  //   #pragma unroll_loop_start
  //   for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {

  //     rectAreaLight = rectAreaLights[ i ];
  //     RE_Direct_RectArea( rectAreaLight, geometry, material, reflectedLight );

  //   }
  //   #pragma unroll_loop_end

  // #endif

  #if defined( RE_IndirectDiffuse )

    vec3 iblIrradiance = vec3( 0.0 );

    vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );

    // COMPAT: pre-r156 uses a struct GeometricContext
    // COMPAT: pre-r156 doesn't have a define USE_LIGHT_PROBES
    #if THREE_VRM_THREE_REVISION >= 157
      #if defined( USE_LIGHT_PROBES )
        irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
      #endif
    #else
      irradiance += getLightProbeIrradiance( lightProbe, geometry.normal );
    #endif

    #if ( NUM_HEMI_LIGHTS > 0 )

      #pragma unroll_loop_start
      for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {

        // COMPAT: pre-r156 uses a struct GeometricContext
        #if THREE_VRM_THREE_REVISION >= 157
          irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
        #else
          irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry.normal );
        #endif

      }
      #pragma unroll_loop_end

    #endif

  #endif

  // #if defined( RE_IndirectSpecular )

  //   vec3 radiance = vec3( 0.0 );
  //   vec3 clearcoatRadiance = vec3( 0.0 );

  // #endif

  #include <lights_fragment_maps>
  #include <lights_fragment_end>

  // modulation
  #include <aomap_fragment>

  vec3 col = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;

  #ifdef DEBUG_LITSHADERATE
    gl_FragColor = vec4( col, diffuseColor.a );
    postCorrection();
    return;
  #endif

  // -- MToon: rim lighting -----------------------------------------
  vec3 viewDir = normalize( vViewPosition );

  #ifndef PHYSICALLY_CORRECT_LIGHTS
    reflectedLight.directSpecular /= PI;
  #endif
  vec3 rimMix = mix( vec3( 1.0 ), reflectedLight.directSpecular, rimLightingMixFactor );

  vec3 rim = parametricRimColorFactor * pow( saturate( 1.0 - dot( viewDir, normal ) + parametricRimLiftFactor ), parametricRimFresnelPowerFactor );

  #ifdef USE_MATCAPTEXTURE
    {
      vec3 x = normalize( vec3( viewDir.z, 0.0, -viewDir.x ) );
      vec3 y = cross( viewDir, x ); // guaranteed to be normalized
      vec2 sphereUv = 0.5 + 0.5 * vec2( dot( x, normal ), -dot( y, normal ) );
      sphereUv = ( matcapTextureUvTransform * vec3( sphereUv, 1 ) ).xy;
      vec3 matcap = texture2D( matcapTexture, sphereUv ).rgb;
      rim += matcapFactor * matcap;
    }
  #endif

  #ifdef USE_RIMMULTIPLYTEXTURE
    vec2 rimMultiplyTextureUv = ( rimMultiplyTextureUvTransform * vec3( uv, 1 ) ).xy;
    rim *= texture2D( rimMultiplyTexture, rimMultiplyTextureUv ).rgb;
  #endif

  col += rimMix * rim;

  // -- MToon: Emission --------------------------------------------------------
  col += totalEmissiveRadiance;

  // #include <envmap_fragment>

  // -- Almost done! -----------------------------------------------------------
  #if defined( OUTLINE )
    col = outlineColorFactor.rgb * mix( vec3( 1.0 ), col, outlineLightingMixFactor );
  #endif

  #ifdef OPAQUE
    diffuseColor.a = 1.0;
  #endif

  gl_FragColor = vec4( col, diffuseColor.a );
  postCorrection();
}
`,cr={None:"none"},ln={None:"none",ScreenCoordinates:"screenCoordinates"},pr={3e3:"",3001:"srgb"};function Ve(e){return parseInt(Pe,10)>=152?e.colorSpace:pr[e.encoding]}var mr=class extends vi{constructor(e={}){var t;super({vertexShader:dr,fragmentShader:hr}),this.uvAnimationScrollXSpeedFactor=0,this.uvAnimationScrollYSpeedFactor=0,this.uvAnimationRotationSpeedFactor=0,this.fog=!0,this.normalMapType=gi,this._ignoreVertexColor=!0,this._v0CompatShade=!1,this._debugMode=cr.None,this._outlineWidthMode=ln.None,this._isOutline=!1,e.transparentWithZWrite&&(e.depthWrite=!0),delete e.transparentWithZWrite,e.fog=!0,e.lights=!0,e.clipping=!0,this.uniforms=Mi.merge([le.common,le.normalmap,le.emissivemap,le.fog,le.lights,{litFactor:{value:new V(1,1,1)},mapUvTransform:{value:new W},colorAlpha:{value:1},normalMapUvTransform:{value:new W},shadeColorFactor:{value:new V(0,0,0)},shadeMultiplyTexture:{value:null},shadeMultiplyTextureUvTransform:{value:new W},shadingShiftFactor:{value:0},shadingShiftTexture:{value:null},shadingShiftTextureUvTransform:{value:new W},shadingShiftTextureScale:{value:1},shadingToonyFactor:{value:.9},giEqualizationFactor:{value:.9},matcapFactor:{value:new V(1,1,1)},matcapTexture:{value:null},matcapTextureUvTransform:{value:new W},parametricRimColorFactor:{value:new V(0,0,0)},rimMultiplyTexture:{value:null},rimMultiplyTextureUvTransform:{value:new W},rimLightingMixFactor:{value:1},parametricRimFresnelPowerFactor:{value:5},parametricRimLiftFactor:{value:0},emissive:{value:new V(0,0,0)},emissiveIntensity:{value:1},emissiveMapUvTransform:{value:new W},outlineWidthMultiplyTexture:{value:null},outlineWidthMultiplyTextureUvTransform:{value:new W},outlineWidthFactor:{value:0},outlineColorFactor:{value:new V(0,0,0)},outlineLightingMixFactor:{value:1},uvAnimationMaskTexture:{value:null},uvAnimationMaskTextureUvTransform:{value:new W},uvAnimationScrollXOffset:{value:0},uvAnimationScrollYOffset:{value:0},uvAnimationRotationPhase:{value:0}},(t=e.uniforms)!=null?t:{}]),this.setValues(e),this._uploadUniformsWorkaround(),this.customProgramCacheKey=()=>[...Object.entries(this._generateDefines()).map(([n,i])=>`${n}:${i}`),this.matcapTexture?`matcapTextureColorSpace:${Ve(this.matcapTexture)}`:"",this.shadeMultiplyTexture?`shadeMultiplyTextureColorSpace:${Ve(this.shadeMultiplyTexture)}`:"",this.rimMultiplyTexture?`rimMultiplyTextureColorSpace:${Ve(this.rimMultiplyTexture)}`:""].join(","),this.onBeforeCompile=n=>{const i=parseInt(Pe,10),r=Object.entries(an(an({},this._generateDefines()),this.defines)).filter(([o,a])=>!!a).map(([o,a])=>`#define ${o} ${a}`).join(`
`)+`
`;n.vertexShader=r+n.vertexShader,n.fragmentShader=r+n.fragmentShader,i<154&&(n.fragmentShader=n.fragmentShader.replace("#include <colorspace_fragment>","#include <encodings_fragment>"))}}get color(){return this.uniforms.litFactor.value}set color(e){this.uniforms.litFactor.value=e}get map(){return this.uniforms.map.value}set map(e){this.uniforms.map.value=e}get normalMap(){return this.uniforms.normalMap.value}set normalMap(e){this.uniforms.normalMap.value=e}get normalScale(){return this.uniforms.normalScale.value}set normalScale(e){this.uniforms.normalScale.value=e}get emissive(){return this.uniforms.emissive.value}set emissive(e){this.uniforms.emissive.value=e}get emissiveIntensity(){return this.uniforms.emissiveIntensity.value}set emissiveIntensity(e){this.uniforms.emissiveIntensity.value=e}get emissiveMap(){return this.uniforms.emissiveMap.value}set emissiveMap(e){this.uniforms.emissiveMap.value=e}get shadeColorFactor(){return this.uniforms.shadeColorFactor.value}set shadeColorFactor(e){this.uniforms.shadeColorFactor.value=e}get shadeMultiplyTexture(){return this.uniforms.shadeMultiplyTexture.value}set shadeMultiplyTexture(e){this.uniforms.shadeMultiplyTexture.value=e}get shadingShiftFactor(){return this.uniforms.shadingShiftFactor.value}set shadingShiftFactor(e){this.uniforms.shadingShiftFactor.value=e}get shadingShiftTexture(){return this.uniforms.shadingShiftTexture.value}set shadingShiftTexture(e){this.uniforms.shadingShiftTexture.value=e}get shadingShiftTextureScale(){return this.uniforms.shadingShiftTextureScale.value}set shadingShiftTextureScale(e){this.uniforms.shadingShiftTextureScale.value=e}get shadingToonyFactor(){return this.uniforms.shadingToonyFactor.value}set shadingToonyFactor(e){this.uniforms.shadingToonyFactor.value=e}get giEqualizationFactor(){return this.uniforms.giEqualizationFactor.value}set giEqualizationFactor(e){this.uniforms.giEqualizationFactor.value=e}get matcapFactor(){return this.uniforms.matcapFactor.value}set matcapFactor(e){this.uniforms.matcapFactor.value=e}get matcapTexture(){return this.uniforms.matcapTexture.value}set matcapTexture(e){this.uniforms.matcapTexture.value=e}get parametricRimColorFactor(){return this.uniforms.parametricRimColorFactor.value}set parametricRimColorFactor(e){this.uniforms.parametricRimColorFactor.value=e}get rimMultiplyTexture(){return this.uniforms.rimMultiplyTexture.value}set rimMultiplyTexture(e){this.uniforms.rimMultiplyTexture.value=e}get rimLightingMixFactor(){return this.uniforms.rimLightingMixFactor.value}set rimLightingMixFactor(e){this.uniforms.rimLightingMixFactor.value=e}get parametricRimFresnelPowerFactor(){return this.uniforms.parametricRimFresnelPowerFactor.value}set parametricRimFresnelPowerFactor(e){this.uniforms.parametricRimFresnelPowerFactor.value=e}get parametricRimLiftFactor(){return this.uniforms.parametricRimLiftFactor.value}set parametricRimLiftFactor(e){this.uniforms.parametricRimLiftFactor.value=e}get outlineWidthMultiplyTexture(){return this.uniforms.outlineWidthMultiplyTexture.value}set outlineWidthMultiplyTexture(e){this.uniforms.outlineWidthMultiplyTexture.value=e}get outlineWidthFactor(){return this.uniforms.outlineWidthFactor.value}set outlineWidthFactor(e){this.uniforms.outlineWidthFactor.value=e}get outlineColorFactor(){return this.uniforms.outlineColorFactor.value}set outlineColorFactor(e){this.uniforms.outlineColorFactor.value=e}get outlineLightingMixFactor(){return this.uniforms.outlineLightingMixFactor.value}set outlineLightingMixFactor(e){this.uniforms.outlineLightingMixFactor.value=e}get uvAnimationMaskTexture(){return this.uniforms.uvAnimationMaskTexture.value}set uvAnimationMaskTexture(e){this.uniforms.uvAnimationMaskTexture.value=e}get uvAnimationScrollXOffset(){return this.uniforms.uvAnimationScrollXOffset.value}set uvAnimationScrollXOffset(e){this.uniforms.uvAnimationScrollXOffset.value=e}get uvAnimationScrollYOffset(){return this.uniforms.uvAnimationScrollYOffset.value}set uvAnimationScrollYOffset(e){this.uniforms.uvAnimationScrollYOffset.value=e}get uvAnimationRotationPhase(){return this.uniforms.uvAnimationRotationPhase.value}set uvAnimationRotationPhase(e){this.uniforms.uvAnimationRotationPhase.value=e}get ignoreVertexColor(){return this._ignoreVertexColor}set ignoreVertexColor(e){this._ignoreVertexColor=e,this.needsUpdate=!0}get v0CompatShade(){return this._v0CompatShade}set v0CompatShade(e){this._v0CompatShade=e,this.needsUpdate=!0}get debugMode(){return this._debugMode}set debugMode(e){this._debugMode=e,this.needsUpdate=!0}get outlineWidthMode(){return this._outlineWidthMode}set outlineWidthMode(e){this._outlineWidthMode=e,this.needsUpdate=!0}get isOutline(){return this._isOutline}set isOutline(e){this._isOutline=e,this.needsUpdate=!0}get isMToonMaterial(){return!0}update(e){this._uploadUniformsWorkaround(),this._updateUVAnimation(e)}copy(e){return super.copy(e),this.map=e.map,this.normalMap=e.normalMap,this.emissiveMap=e.emissiveMap,this.shadeMultiplyTexture=e.shadeMultiplyTexture,this.shadingShiftTexture=e.shadingShiftTexture,this.matcapTexture=e.matcapTexture,this.rimMultiplyTexture=e.rimMultiplyTexture,this.outlineWidthMultiplyTexture=e.outlineWidthMultiplyTexture,this.uvAnimationMaskTexture=e.uvAnimationMaskTexture,this.normalMapType=e.normalMapType,this.uvAnimationScrollXSpeedFactor=e.uvAnimationScrollXSpeedFactor,this.uvAnimationScrollYSpeedFactor=e.uvAnimationScrollYSpeedFactor,this.uvAnimationRotationSpeedFactor=e.uvAnimationRotationSpeedFactor,this.ignoreVertexColor=e.ignoreVertexColor,this.v0CompatShade=e.v0CompatShade,this.debugMode=e.debugMode,this.outlineWidthMode=e.outlineWidthMode,this.isOutline=e.isOutline,this.needsUpdate=!0,this}_updateUVAnimation(e){this.uniforms.uvAnimationScrollXOffset.value+=e*this.uvAnimationScrollXSpeedFactor,this.uniforms.uvAnimationScrollYOffset.value+=e*this.uvAnimationScrollYSpeedFactor,this.uniforms.uvAnimationRotationPhase.value+=e*this.uvAnimationRotationSpeedFactor,this.uniforms.alphaTest.value=this.alphaTest,this.uniformsNeedUpdate=!0}_uploadUniformsWorkaround(){this.uniforms.opacity.value=this.opacity,this._updateTextureMatrix(this.uniforms.map,this.uniforms.mapUvTransform),this._updateTextureMatrix(this.uniforms.normalMap,this.uniforms.normalMapUvTransform),this._updateTextureMatrix(this.uniforms.emissiveMap,this.uniforms.emissiveMapUvTransform),this._updateTextureMatrix(this.uniforms.shadeMultiplyTexture,this.uniforms.shadeMultiplyTextureUvTransform),this._updateTextureMatrix(this.uniforms.shadingShiftTexture,this.uniforms.shadingShiftTextureUvTransform),this._updateTextureMatrix(this.uniforms.matcapTexture,this.uniforms.matcapTextureUvTransform),this._updateTextureMatrix(this.uniforms.rimMultiplyTexture,this.uniforms.rimMultiplyTextureUvTransform),this._updateTextureMatrix(this.uniforms.outlineWidthMultiplyTexture,this.uniforms.outlineWidthMultiplyTextureUvTransform),this._updateTextureMatrix(this.uniforms.uvAnimationMaskTexture,this.uniforms.uvAnimationMaskTextureUvTransform),this.uniformsNeedUpdate=!0}_generateDefines(){const e=parseInt(Pe,10),t=this.outlineWidthMultiplyTexture!==null,n=this.map!==null||this.normalMap!==null||this.emissiveMap!==null||this.shadeMultiplyTexture!==null||this.shadingShiftTexture!==null||this.rimMultiplyTexture!==null||this.uvAnimationMaskTexture!==null;return{THREE_VRM_THREE_REVISION:e,OUTLINE:this._isOutline,MTOON_USE_UV:t||n,MTOON_UVS_VERTEX_ONLY:t&&!n,V0_COMPAT_SHADE:this._v0CompatShade,USE_SHADEMULTIPLYTEXTURE:this.shadeMultiplyTexture!==null,USE_SHADINGSHIFTTEXTURE:this.shadingShiftTexture!==null,USE_MATCAPTEXTURE:this.matcapTexture!==null,USE_RIMMULTIPLYTEXTURE:this.rimMultiplyTexture!==null,USE_OUTLINEWIDTHMULTIPLYTEXTURE:this._isOutline&&this.outlineWidthMultiplyTexture!==null,USE_UVANIMATIONMASKTEXTURE:this.uvAnimationMaskTexture!==null,IGNORE_VERTEX_COLOR:this._ignoreVertexColor===!0,DEBUG_NORMAL:this._debugMode==="normal",DEBUG_LITSHADERATE:this._debugMode==="litShadeRate",DEBUG_UV:this._debugMode==="uv",OUTLINE_WIDTH_SCREEN:this._isOutline&&this._outlineWidthMode===ln.ScreenCoordinates}}_updateTextureMatrix(e,t){e.value&&(e.value.matrixAutoUpdate&&e.value.updateMatrix(),t.value.copy(e.value.matrix))}},fr=new Set(["1.0","1.0-beta"]),In=class Se{get name(){return Se.EXTENSION_NAME}constructor(t,n={}){var i,r,o,a;this.parser=t,this.materialType=(i=n.materialType)!=null?i:mr,this.renderOrderOffset=(r=n.renderOrderOffset)!=null?r:0,this.v0CompatShade=(o=n.v0CompatShade)!=null?o:!1,this.debugMode=(a=n.debugMode)!=null?a:"none",this._mToonMaterialSet=new Set}beforeRoot(){return Q(this,null,function*(){this._removeUnlitExtensionIfMToonExists()})}afterRoot(t){return Q(this,null,function*(){t.userData.vrmMToonMaterials=Array.from(this._mToonMaterialSet)})}getMaterialType(t){return this._getMToonExtension(t)?this.materialType:null}extendMaterialParams(t,n){const i=this._getMToonExtension(t);return i?this._extendMaterialParams(i,n):null}loadMesh(t){return Q(this,null,function*(){var n;const i=this.parser,o=(n=i.json.meshes)==null?void 0:n[t];if(o==null)throw new Error(`MToonMaterialLoaderPlugin: Attempt to use meshes[${t}] of glTF but the mesh doesn't exist`);const a=o.primitives,l=yield i.loadMesh(t);if(a.length===1){const s=l,u=a[0].material;u!=null&&this._setupPrimitive(s,u)}else{const s=l;for(let u=0;u<a.length;u++){const d=s.children[u],h=a[u].material;h!=null&&this._setupPrimitive(d,h)}}return l})}_removeUnlitExtensionIfMToonExists(){const i=this.parser.json.materials;i?.map((r,o)=>{var a;this._getMToonExtension(o)&&((a=r.extensions)!=null&&a.KHR_materials_unlit)&&delete r.extensions.KHR_materials_unlit})}_getMToonExtension(t){var n,i;const a=(n=this.parser.json.materials)==null?void 0:n[t];if(a==null){console.warn(`MToonMaterialLoaderPlugin: Attempt to use materials[${t}] of glTF but the material doesn't exist`);return}const l=(i=a.extensions)==null?void 0:i[Se.EXTENSION_NAME];if(l==null)return;const s=l.specVersion;if(!fr.has(s)){console.warn(`MToonMaterialLoaderPlugin: Unknown ${Se.EXTENSION_NAME} specVersion "${s}"`);return}return l}_extendMaterialParams(t,n){return Q(this,null,function*(){var i;delete n.metalness,delete n.roughness;const r=new ur(this.parser,n);r.assignPrimitive("transparentWithZWrite",t.transparentWithZWrite),r.assignColor("shadeColorFactor",t.shadeColorFactor),r.assignTexture("shadeMultiplyTexture",t.shadeMultiplyTexture,!0),r.assignPrimitive("shadingShiftFactor",t.shadingShiftFactor),r.assignTexture("shadingShiftTexture",t.shadingShiftTexture,!0),r.assignPrimitive("shadingShiftTextureScale",(i=t.shadingShiftTexture)==null?void 0:i.scale),r.assignPrimitive("shadingToonyFactor",t.shadingToonyFactor),r.assignPrimitive("giEqualizationFactor",t.giEqualizationFactor),r.assignColor("matcapFactor",t.matcapFactor),r.assignTexture("matcapTexture",t.matcapTexture,!0),r.assignColor("parametricRimColorFactor",t.parametricRimColorFactor),r.assignTexture("rimMultiplyTexture",t.rimMultiplyTexture,!0),r.assignPrimitive("rimLightingMixFactor",t.rimLightingMixFactor),r.assignPrimitive("parametricRimFresnelPowerFactor",t.parametricRimFresnelPowerFactor),r.assignPrimitive("parametricRimLiftFactor",t.parametricRimLiftFactor),r.assignPrimitive("outlineWidthMode",t.outlineWidthMode),r.assignPrimitive("outlineWidthFactor",t.outlineWidthFactor),r.assignTexture("outlineWidthMultiplyTexture",t.outlineWidthMultiplyTexture,!1),r.assignColor("outlineColorFactor",t.outlineColorFactor),r.assignPrimitive("outlineLightingMixFactor",t.outlineLightingMixFactor),r.assignTexture("uvAnimationMaskTexture",t.uvAnimationMaskTexture,!1),r.assignPrimitive("uvAnimationScrollXSpeedFactor",t.uvAnimationScrollXSpeedFactor),r.assignPrimitive("uvAnimationScrollYSpeedFactor",t.uvAnimationScrollYSpeedFactor),r.assignPrimitive("uvAnimationRotationSpeedFactor",t.uvAnimationRotationSpeedFactor),r.assignPrimitive("v0CompatShade",this.v0CompatShade),r.assignPrimitive("debugMode",this.debugMode),yield r.pending})}_setupPrimitive(t,n){const i=this._getMToonExtension(n);if(i){const r=this._parseRenderOrder(i);t.renderOrder=r+this.renderOrderOffset,this._generateOutline(t),this._addToMaterialSet(t);return}}_shouldGenerateOutline(t){return typeof t.outlineWidthMode=="string"&&t.outlineWidthMode!=="none"&&typeof t.outlineWidthFactor=="number"&&t.outlineWidthFactor>0}_generateOutline(t){const n=t.material;if(!(n instanceof mi)||!this._shouldGenerateOutline(n))return;t.material=[n];const i=n.clone();i.name+=" (Outline)",i.isOutline=!0,i.side=fi,t.material.push(i);const r=t.geometry,o=r.index?r.index.count:r.attributes.position.count/3;r.addGroup(0,o,0),r.addGroup(0,o,1)}_addToMaterialSet(t){const n=t.material,i=new Set;Array.isArray(n)?n.forEach(r=>i.add(r)):i.add(n);for(const r of i)this._mToonMaterialSet.add(r)}_parseRenderOrder(t){var n;return(t.transparentWithZWrite?0:19)+((n=t.renderQueueOffsetNumber)!=null?n:0)}};In.EXTENSION_NAME="VRMC_materials_mtoon";var _r=In,vr=(e,t,n)=>new Promise((i,r)=>{var o=s=>{try{l(n.next(s))}catch(u){r(u)}},a=s=>{try{l(n.throw(s))}catch(u){r(u)}},l=s=>s.done?i(s.value):Promise.resolve(s.value).then(o,a);l((n=n.apply(e,t)).next())}),Cn=class Ye{get name(){return Ye.EXTENSION_NAME}constructor(t){this.parser=t}extendMaterialParams(t,n){return vr(this,null,function*(){const i=this._getHDREmissiveMultiplierExtension(t);if(i==null)return;console.warn("VRMMaterialsHDREmissiveMultiplierLoaderPlugin: `VRMC_materials_hdr_emissiveMultiplier` is archived. Use `KHR_materials_emissive_strength` instead.");const r=i.emissiveMultiplier;n.emissiveIntensity=r})}_getHDREmissiveMultiplierExtension(t){var n,i;const a=(n=this.parser.json.materials)==null?void 0:n[t];if(a==null){console.warn(`VRMMaterialsHDREmissiveMultiplierLoaderPlugin: Attempt to use materials[${t}] of glTF but the material doesn't exist`);return}const l=(i=a.extensions)==null?void 0:i[Ye.EXTENSION_NAME];if(l!=null)return l}};Cn.EXTENSION_NAME="VRMC_materials_hdr_emissiveMultiplier";var gr=Cn,Mr=Object.defineProperty,xr=Object.defineProperties,yr=Object.getOwnPropertyDescriptors,un=Object.getOwnPropertySymbols,Rr=Object.prototype.hasOwnProperty,Tr=Object.prototype.propertyIsEnumerable,dn=(e,t,n)=>t in e?Mr(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,B=(e,t)=>{for(var n in t||(t={}))Rr.call(t,n)&&dn(e,n,t[n]);if(un)for(var n of un(t))Tr.call(t,n)&&dn(e,n,t[n]);return e},hn=(e,t)=>xr(e,yr(t)),wr=(e,t,n)=>new Promise((i,r)=>{var o=s=>{try{l(n.next(s))}catch(u){r(u)}},a=s=>{try{l(n.throw(s))}catch(u){r(u)}},l=s=>s.done?i(s.value):Promise.resolve(s.value).then(o,a);l((n=n.apply(e,t)).next())});function ee(e){return Math.pow(e,2.2)}var Sr=class{get name(){return"VRMMaterialsV0CompatPlugin"}constructor(e){var t;this.parser=e,this._renderQueueMapTransparent=new Map,this._renderQueueMapTransparentZWrite=new Map;const n=this.parser.json;n.extensionsUsed=(t=n.extensionsUsed)!=null?t:[],n.extensionsUsed.indexOf("KHR_texture_transform")===-1&&n.extensionsUsed.push("KHR_texture_transform")}beforeRoot(){return wr(this,null,function*(){var e;const t=this.parser.json,n=(e=t.extensions)==null?void 0:e.VRM,i=n?.materialProperties;i&&(this._populateRenderQueueMap(i),i.forEach((r,o)=>{var a,l;const s=(a=t.materials)==null?void 0:a[o];if(s==null){console.warn(`VRMMaterialsV0CompatPlugin: Attempt to use materials[${o}] of glTF but the material doesn't exist`);return}if(r.shader==="VRM/MToon"){const u=this._parseV0MToonProperties(r,s);t.materials[o]=u}else if((l=r.shader)!=null&&l.startsWith("VRM/Unlit")){const u=this._parseV0UnlitProperties(r,s);t.materials[o]=u}else r.shader==="VRM_USE_GLTFSHADER"||console.warn(`VRMMaterialsV0CompatPlugin: Unknown shader: ${r.shader}`)}))})}_parseV0MToonProperties(e,t){var n,i,r,o,a,l,s,u,d,h,f,c,_,p,v,g,L,w,y,M,x,S,A,O,E,P,C,z,oe,se,k,D,J,ae,U,et,tt,nt,it,rt,ot,st,at,lt,ut,dt,ht,ct,pt,mt,ft,_t,vt,gt,Mt;const xt=(i=(n=e.keywordMap)==null?void 0:n._ALPHABLEND_ON)!=null?i:!1,Fn=((r=e.floatProperties)==null?void 0:r._ZWrite)===1&&xt,Bn=this._v0ParseRenderQueue(e),yt=(a=(o=e.keywordMap)==null?void 0:o._ALPHATEST_ON)!=null?a:!1,Hn=xt?"BLEND":yt?"MASK":"OPAQUE",Wn=yt?(s=(l=e.floatProperties)==null?void 0:l._Cutoff)!=null?s:.5:void 0,kn=((d=(u=e.floatProperties)==null?void 0:u._CullMode)!=null?d:2)===0,j=this._portTextureTransform(e),zn=((f=(h=e.vectorProperties)==null?void 0:h._Color)!=null?f:[1,1,1,1]).map((Ot,pi)=>pi===3?Ot:ee(Ot)),Rt=(c=e.textureProperties)==null?void 0:c._MainTex,Xn=Rt!=null?{index:Rt,extensions:B({},j)}:void 0,jn=(p=(_=e.floatProperties)==null?void 0:_._BumpScale)!=null?p:1,Tt=(v=e.textureProperties)==null?void 0:v._BumpMap,Gn=Tt!=null?{index:Tt,scale:jn,extensions:B({},j)}:void 0,Yn=((L=(g=e.vectorProperties)==null?void 0:g._EmissionColor)!=null?L:[0,0,0,1]).map(ee),wt=(w=e.textureProperties)==null?void 0:w._EmissionMap,qn=wt!=null?{index:wt,extensions:B({},j)}:void 0,Qn=((M=(y=e.vectorProperties)==null?void 0:y._ShadeColor)!=null?M:[.97,.81,.86,1]).map(ee),St=(x=e.textureProperties)==null?void 0:x._ShadeTexture,Zn=St!=null?{index:St,extensions:B({},j)}:void 0;let _e=(A=(S=e.floatProperties)==null?void 0:S._ShadeShift)!=null?A:0,ve=(E=(O=e.floatProperties)==null?void 0:O._ShadeToony)!=null?E:.9;ve=I.lerp(ve,1,.5+.5*_e),_e=-_e-(1-ve);const Et=(C=(P=e.floatProperties)==null?void 0:P._IndirectLightIntensity)!=null?C:.1,$n=Et?1-Et:void 0,Oe=(z=e.textureProperties)==null?void 0:z._SphereAdd,Jn=Oe!=null?[1,1,1]:void 0,Kn=Oe!=null?{index:Oe}:void 0,ei=(se=(oe=e.floatProperties)==null?void 0:oe._RimLightingMix)!=null?se:0,Pt=(k=e.textureProperties)==null?void 0:k._RimTexture,ti=Pt!=null?{index:Pt,extensions:B({},j)}:void 0,ni=((J=(D=e.vectorProperties)==null?void 0:D._RimColor)!=null?J:[0,0,0,1]).map(ee),ii=(U=(ae=e.floatProperties)==null?void 0:ae._RimFresnelPower)!=null?U:1,ri=(tt=(et=e.floatProperties)==null?void 0:et._RimLift)!=null?tt:0,oi=["none","worldCoordinates","screenCoordinates"][(it=(nt=e.floatProperties)==null?void 0:nt._OutlineWidthMode)!=null?it:0];let Ie=(ot=(rt=e.floatProperties)==null?void 0:rt._OutlineWidth)!=null?ot:0;Ie=.01*Ie;const At=(st=e.textureProperties)==null?void 0:st._OutlineWidthTexture,si=At!=null?{index:At,extensions:B({},j)}:void 0,ai=((lt=(at=e.vectorProperties)==null?void 0:at._OutlineColor)!=null?lt:[0,0,0]).map(ee),li=((dt=(ut=e.floatProperties)==null?void 0:ut._OutlineColorMode)!=null?dt:0)===1?(ct=(ht=e.floatProperties)==null?void 0:ht._OutlineLightingMix)!=null?ct:1:0,Lt=(pt=e.textureProperties)==null?void 0:pt._UvAnimMaskTexture,ui=Lt!=null?{index:Lt,extensions:B({},j)}:void 0,di=(ft=(mt=e.floatProperties)==null?void 0:mt._UvAnimScrollX)!=null?ft:0;let ge=(vt=(_t=e.floatProperties)==null?void 0:_t._UvAnimScrollY)!=null?vt:0;ge!=null&&(ge=-ge);const hi=(Mt=(gt=e.floatProperties)==null?void 0:gt._UvAnimRotation)!=null?Mt:0,ci={specVersion:"1.0",transparentWithZWrite:Fn,renderQueueOffsetNumber:Bn,shadeColorFactor:Qn,shadeMultiplyTexture:Zn,shadingShiftFactor:_e,shadingToonyFactor:ve,giEqualizationFactor:$n,matcapFactor:Jn,matcapTexture:Kn,rimLightingMixFactor:ei,rimMultiplyTexture:ti,parametricRimColorFactor:ni,parametricRimFresnelPowerFactor:ii,parametricRimLiftFactor:ri,outlineWidthMode:oi,outlineWidthFactor:Ie,outlineWidthMultiplyTexture:si,outlineColorFactor:ai,outlineLightingMixFactor:li,uvAnimationMaskTexture:ui,uvAnimationScrollXSpeedFactor:di,uvAnimationScrollYSpeedFactor:ge,uvAnimationRotationSpeedFactor:hi};return hn(B({},t),{pbrMetallicRoughness:{baseColorFactor:zn,baseColorTexture:Xn},normalTexture:Gn,emissiveTexture:qn,emissiveFactor:Yn,alphaMode:Hn,alphaCutoff:Wn,doubleSided:kn,extensions:{VRMC_materials_mtoon:ci}})}_parseV0UnlitProperties(e,t){var n,i,r,o,a;const l=e.shader==="VRM/UnlitTransparentZWrite",s=e.shader==="VRM/UnlitTransparent"||l,u=this._v0ParseRenderQueue(e),d=e.shader==="VRM/UnlitCutout",h=s?"BLEND":d?"MASK":"OPAQUE",f=d?(i=(n=e.floatProperties)==null?void 0:n._Cutoff)!=null?i:.5:void 0,c=this._portTextureTransform(e),_=((o=(r=e.vectorProperties)==null?void 0:r._Color)!=null?o:[1,1,1,1]).map(ee),p=(a=e.textureProperties)==null?void 0:a._MainTex,v=p!=null?{index:p,extensions:B({},c)}:void 0,g={specVersion:"1.0",transparentWithZWrite:l,renderQueueOffsetNumber:u,shadeColorFactor:_,shadeMultiplyTexture:v};return hn(B({},t),{pbrMetallicRoughness:{baseColorFactor:_,baseColorTexture:v},alphaMode:h,alphaCutoff:f,extensions:{VRMC_materials_mtoon:g}})}_portTextureTransform(e){var t,n,i,r,o;const a=(t=e.vectorProperties)==null?void 0:t._MainTex;if(a==null)return{};const l=[(n=a?.[0])!=null?n:0,(i=a?.[1])!=null?i:0],s=[(r=a?.[2])!=null?r:1,(o=a?.[3])!=null?o:1];return l[1]=1-s[1]-l[1],{KHR_texture_transform:{offset:l,scale:s}}}_v0ParseRenderQueue(e){var t,n;const i=e.shader==="VRM/UnlitTransparentZWrite",r=((t=e.keywordMap)==null?void 0:t._ALPHABLEND_ON)!=null||e.shader==="VRM/UnlitTransparent"||i,o=((n=e.floatProperties)==null?void 0:n._ZWrite)===1||i;let a=0;if(r){const l=e.renderQueue;l!=null&&(o?a=this._renderQueueMapTransparentZWrite.get(l):a=this._renderQueueMapTransparent.get(l))}return a}_populateRenderQueueMap(e){const t=new Set,n=new Set;e.forEach(i=>{var r,o;const a=i.shader==="VRM/UnlitTransparentZWrite",l=((r=i.keywordMap)==null?void 0:r._ALPHABLEND_ON)!=null||i.shader==="VRM/UnlitTransparent"||a,s=((o=i.floatProperties)==null?void 0:o._ZWrite)===1||a;if(l){const u=i.renderQueue;u!=null&&(s?n.add(u):t.add(u))}}),t.size>10&&console.warn(`VRMMaterialsV0CompatPlugin: This VRM uses ${t.size} render queues for Transparent materials while VRM 1.0 only supports up to 10 render queues. The model might not be rendered correctly.`),n.size>10&&console.warn(`VRMMaterialsV0CompatPlugin: This VRM uses ${n.size} render queues for TransparentZWrite materials while VRM 1.0 only supports up to 10 render queues. The model might not be rendered correctly.`),Array.from(t).sort().forEach((i,r)=>{const o=Math.min(Math.max(r-t.size+1,-9),0);this._renderQueueMapTransparent.set(i,o)}),Array.from(n).sort().forEach((i,r)=>{const o=Math.min(Math.max(r,0),9);this._renderQueueMapTransparentZWrite.set(i,o)})}},cn=(e,t,n)=>new Promise((i,r)=>{var o=s=>{try{l(n.next(s))}catch(u){r(u)}},a=s=>{try{l(n.throw(s))}catch(u){r(u)}},l=s=>s.done?i(s.value):Promise.resolve(s.value).then(o,a);l((n=n.apply(e,t)).next())}),X=new m,De=class extends re{constructor(e){super(),this._attrPosition=new b(new Float32Array([0,0,0,0,0,0]),3),this._attrPosition.setUsage(xi);const t=new $;t.setAttribute("position",this._attrPosition);const n=new Le({color:16711935,depthTest:!1,depthWrite:!1});this._line=new yi(t,n),this.add(this._line),this.constraint=e}updateMatrixWorld(e){X.setFromMatrixPosition(this.constraint.destination.matrixWorld),this._attrPosition.setXYZ(0,X.x,X.y,X.z),this.constraint.source&&X.setFromMatrixPosition(this.constraint.source.matrixWorld),this._attrPosition.setXYZ(1,X.x,X.y,X.z),this._attrPosition.needsUpdate=!0,super.updateMatrixWorld(e)}};function pn(e,t){return t.set(e.elements[12],e.elements[13],e.elements[14])}var Er=new m,Pr=new m;function Ar(e,t){return e.decompose(Er,t,Pr),t}function Ae(e){return e.invert?e.invert():e.inverse(),e}var Je=class{constructor(e,t){this.destination=e,this.source=t,this.weight=1}},Lr=new m,Or=new m,Ir=new m,Cr=new R,Ur=new R,br=new R,Nr=class extends Je{get aimAxis(){return this._aimAxis}set aimAxis(e){this._aimAxis=e,this._v3AimAxis.set(e==="PositiveX"?1:e==="NegativeX"?-1:0,e==="PositiveY"?1:e==="NegativeY"?-1:0,e==="PositiveZ"?1:e==="NegativeZ"?-1:0)}get dependencies(){const e=new Set([this.source]);return this.destination.parent&&e.add(this.destination.parent),e}constructor(e,t){super(e,t),this._aimAxis="PositiveX",this._v3AimAxis=new m(1,0,0),this._dstRestQuat=new R}setInitState(){this._dstRestQuat.copy(this.destination.quaternion)}update(){this.destination.updateWorldMatrix(!0,!1),this.source.updateWorldMatrix(!0,!1);const e=Cr.identity(),t=Ur.identity();this.destination.parent&&(Ar(this.destination.parent.matrixWorld,e),Ae(t.copy(e)));const n=Lr.copy(this._v3AimAxis).applyQuaternion(this._dstRestQuat).applyQuaternion(e),i=pn(this.source.matrixWorld,Or).sub(pn(this.destination.matrixWorld,Ir)).normalize(),r=br.setFromUnitVectors(n,i).premultiply(t).multiply(e).multiply(this._dstRestQuat);this.destination.quaternion.copy(this._dstRestQuat).slerp(r,this.weight)}};function Vr(e,t){const n=[e];let i=e.parent;for(;i!==null;)n.unshift(i),i=i.parent;n.forEach(r=>{t(r)})}var Dr=class{constructor(){this._constraints=new Set,this._objectConstraintsMap=new Map}get constraints(){return this._constraints}addConstraint(e){this._constraints.add(e);let t=this._objectConstraintsMap.get(e.destination);t==null&&(t=new Set,this._objectConstraintsMap.set(e.destination,t)),t.add(e)}deleteConstraint(e){this._constraints.delete(e),this._objectConstraintsMap.get(e.destination).delete(e)}setInitState(){const e=new Set,t=new Set;for(const n of this._constraints)this._processConstraint(n,e,t,i=>i.setInitState())}update(){const e=new Set,t=new Set;for(const n of this._constraints)this._processConstraint(n,e,t,i=>i.update())}_processConstraint(e,t,n,i){if(n.has(e))return;if(t.has(e))throw new Error("VRMNodeConstraintManager: Circular dependency detected while updating constraints");t.add(e);const r=e.dependencies;for(const o of r)Vr(o,a=>{const l=this._objectConstraintsMap.get(a);if(l)for(const s of l)this._processConstraint(s,t,n,i)});i(e),n.add(e)}},Fr=new R,Br=new R,Hr=class extends Je{get dependencies(){return new Set([this.source])}constructor(e,t){super(e,t),this._dstRestQuat=new R,this._invSrcRestQuat=new R}setInitState(){this._dstRestQuat.copy(this.destination.quaternion),Ae(this._invSrcRestQuat.copy(this.source.quaternion))}update(){const e=Fr.copy(this._invSrcRestQuat).multiply(this.source.quaternion),t=Br.copy(this._dstRestQuat).multiply(e);this.destination.quaternion.copy(this._dstRestQuat).slerp(t,this.weight)}},Wr=new m,kr=new R,zr=new R,Xr=class extends Je{get rollAxis(){return this._rollAxis}set rollAxis(e){this._rollAxis=e,this._v3RollAxis.set(e==="X"?1:0,e==="Y"?1:0,e==="Z"?1:0)}get dependencies(){return new Set([this.source])}constructor(e,t){super(e,t),this._rollAxis="X",this._v3RollAxis=new m(1,0,0),this._dstRestQuat=new R,this._invDstRestQuat=new R,this._invSrcRestQuatMulDstRestQuat=new R}setInitState(){this._dstRestQuat.copy(this.destination.quaternion),Ae(this._invDstRestQuat.copy(this._dstRestQuat)),Ae(this._invSrcRestQuatMulDstRestQuat.copy(this.source.quaternion)).multiply(this._dstRestQuat)}update(){const e=kr.copy(this._invDstRestQuat).multiply(this.source.quaternion).multiply(this._invSrcRestQuatMulDstRestQuat),t=Wr.copy(this._v3RollAxis).applyQuaternion(e),i=zr.setFromUnitVectors(t,this._v3RollAxis).premultiply(this._dstRestQuat).multiply(e);this.destination.quaternion.copy(this._dstRestQuat).slerp(i,this.weight)}},jr=new Set(["1.0","1.0-beta"]),Un=class fe{get name(){return fe.EXTENSION_NAME}constructor(t,n){this.parser=t,this.helperRoot=n?.helperRoot}afterRoot(t){return cn(this,null,function*(){t.userData.vrmNodeConstraintManager=yield this._import(t)})}_import(t){return cn(this,null,function*(){var n;const i=this.parser.json;if(!(((n=i.extensionsUsed)==null?void 0:n.indexOf(fe.EXTENSION_NAME))!==-1))return null;const o=new Dr,a=yield this.parser.getDependencies("node");return a.forEach((l,s)=>{var u;const d=i.nodes[s],h=(u=d?.extensions)==null?void 0:u[fe.EXTENSION_NAME];if(h==null)return;const f=h.specVersion;if(!jr.has(f)){console.warn(`VRMNodeConstraintLoaderPlugin: Unknown ${fe.EXTENSION_NAME} specVersion "${f}"`);return}const c=h.constraint;if(c.roll!=null){const _=this._importRollConstraint(l,a,c.roll);o.addConstraint(_)}else if(c.aim!=null){const _=this._importAimConstraint(l,a,c.aim);o.addConstraint(_)}else if(c.rotation!=null){const _=this._importRotationConstraint(l,a,c.rotation);o.addConstraint(_)}}),t.scene.updateMatrixWorld(),o.setInitState(),o})}_importRollConstraint(t,n,i){const{source:r,rollAxis:o,weight:a}=i,l=n[r],s=new Xr(t,l);if(o!=null&&(s.rollAxis=o),a!=null&&(s.weight=a),this.helperRoot){const u=new De(s);this.helperRoot.add(u)}return s}_importAimConstraint(t,n,i){const{source:r,aimAxis:o,weight:a}=i,l=n[r],s=new Nr(t,l);if(o!=null&&(s.aimAxis=o),a!=null&&(s.weight=a),this.helperRoot){const u=new De(s);this.helperRoot.add(u)}return s}_importRotationConstraint(t,n,i){const{source:r,weight:o}=i,a=n[r],l=new Hr(t,a);if(o!=null&&(l.weight=o),this.helperRoot){const s=new De(l);this.helperRoot.add(s)}return l}};Un.EXTENSION_NAME="VRMC_node_constraint";var Gr=Un,Re=(e,t,n)=>new Promise((i,r)=>{var o=s=>{try{l(n.next(s))}catch(u){r(u)}},a=s=>{try{l(n.throw(s))}catch(u){r(u)}},l=s=>s.done?i(s.value):Promise.resolve(s.value).then(o,a);l((n=n.apply(e,t)).next())}),Ke=class{},Fe=new m,q=new m,bn=class extends Ke{get type(){return"capsule"}constructor(e){var t,n,i,r;super(),this.offset=(t=e?.offset)!=null?t:new m(0,0,0),this.tail=(n=e?.tail)!=null?n:new m(0,0,0),this.radius=(i=e?.radius)!=null?i:0,this.inside=(r=e?.inside)!=null?r:!1}calculateCollision(e,t,n,i){Fe.setFromMatrixPosition(e),q.subVectors(this.tail,this.offset).applyMatrix4(e),q.sub(Fe);const r=q.lengthSq();i.copy(t).sub(Fe);const o=q.dot(i);o<=0||(r<=o||q.multiplyScalar(o/r),i.sub(q));const a=i.length(),l=this.inside?this.radius-n-a:a-n-this.radius;return l<0&&(i.multiplyScalar(1/a),this.inside&&i.negate()),l}},Be=new m,mn=new W,Nn=class extends Ke{get type(){return"plane"}constructor(e){var t,n;super(),this.offset=(t=e?.offset)!=null?t:new m(0,0,0),this.normal=(n=e?.normal)!=null?n:new m(0,0,1)}calculateCollision(e,t,n,i){i.setFromMatrixPosition(e),i.negate().add(t),mn.getNormalMatrix(e),Be.copy(this.normal).applyNormalMatrix(mn).normalize();const r=i.dot(Be)-n;return i.copy(Be),r}},Yr=new m,Vn=class extends Ke{get type(){return"sphere"}constructor(e){var t,n,i;super(),this.offset=(t=e?.offset)!=null?t:new m(0,0,0),this.radius=(n=e?.radius)!=null?n:0,this.inside=(i=e?.inside)!=null?i:!1}calculateCollision(e,t,n,i){i.subVectors(t,Yr.setFromMatrixPosition(e));const r=i.length(),o=this.inside?this.radius-n-r:r-n-this.radius;return o<0&&(i.multiplyScalar(1/r),this.inside&&i.negate()),o}},H=new m,qr=class extends ${constructor(e){super(),this.worldScale=1,this._currentRadius=0,this._currentOffset=new m,this._currentTail=new m,this._shape=e,this._attrPos=new b(new Float32Array(396),3),this.setAttribute("position",this._attrPos),this._attrIndex=new b(new Uint16Array(264),1),this.setIndex(this._attrIndex),this._buildIndex(),this.update()}update(){let e=!1;const t=this._shape.radius/this.worldScale;this._currentRadius!==t&&(this._currentRadius=t,e=!0),this._currentOffset.equals(this._shape.offset)||(this._currentOffset.copy(this._shape.offset),e=!0);const n=H.copy(this._shape.tail).divideScalar(this.worldScale);this._currentTail.distanceToSquared(n)>1e-10&&(this._currentTail.copy(n),e=!0),e&&this._buildPosition()}_buildPosition(){H.copy(this._currentTail).sub(this._currentOffset);const e=H.length()/this._currentRadius;for(let i=0;i<=16;i++){const r=i/16*Math.PI;this._attrPos.setXYZ(i,-Math.sin(r),-Math.cos(r),0),this._attrPos.setXYZ(17+i,e+Math.sin(r),Math.cos(r),0),this._attrPos.setXYZ(34+i,-Math.sin(r),0,-Math.cos(r)),this._attrPos.setXYZ(51+i,e+Math.sin(r),0,Math.cos(r))}for(let i=0;i<32;i++){const r=i/16*Math.PI;this._attrPos.setXYZ(68+i,0,Math.sin(r),Math.cos(r)),this._attrPos.setXYZ(100+i,e,Math.sin(r),Math.cos(r))}const t=Math.atan2(H.y,Math.sqrt(H.x*H.x+H.z*H.z)),n=-Math.atan2(H.z,H.x);this.rotateZ(t),this.rotateY(n),this.scale(this._currentRadius,this._currentRadius,this._currentRadius),this.translate(this._currentOffset.x,this._currentOffset.y,this._currentOffset.z),this._attrPos.needsUpdate=!0}_buildIndex(){for(let e=0;e<34;e++){const t=(e+1)%34;this._attrIndex.setXY(e*2,e,t),this._attrIndex.setXY(68+e*2,34+e,34+t)}for(let e=0;e<32;e++){const t=(e+1)%32;this._attrIndex.setXY(136+e*2,68+e,68+t),this._attrIndex.setXY(200+e*2,100+e,100+t)}this._attrIndex.needsUpdate=!0}},Qr=class extends ${constructor(e){super(),this.worldScale=1,this._currentOffset=new m,this._currentNormal=new m,this._shape=e,this._attrPos=new b(new Float32Array(18),3),this.setAttribute("position",this._attrPos),this._attrIndex=new b(new Uint16Array(10),1),this.setIndex(this._attrIndex),this._buildIndex(),this.update()}update(){let e=!1;this._currentOffset.equals(this._shape.offset)||(this._currentOffset.copy(this._shape.offset),e=!0),this._currentNormal.equals(this._shape.normal)||(this._currentNormal.copy(this._shape.normal),e=!0),e&&this._buildPosition()}_buildPosition(){this._attrPos.setXYZ(0,-.5,-.5,0),this._attrPos.setXYZ(1,.5,-.5,0),this._attrPos.setXYZ(2,.5,.5,0),this._attrPos.setXYZ(3,-.5,.5,0),this._attrPos.setXYZ(4,0,0,0),this._attrPos.setXYZ(5,0,0,.25),this.translate(this._currentOffset.x,this._currentOffset.y,this._currentOffset.z),this.lookAt(this._currentNormal),this._attrPos.needsUpdate=!0}_buildIndex(){this._attrIndex.setXY(0,0,1),this._attrIndex.setXY(2,1,2),this._attrIndex.setXY(4,2,3),this._attrIndex.setXY(6,3,0),this._attrIndex.setXY(8,4,5),this._attrIndex.needsUpdate=!0}},Zr=class extends ${constructor(e){super(),this.worldScale=1,this._currentRadius=0,this._currentOffset=new m,this._shape=e,this._attrPos=new b(new Float32Array(288),3),this.setAttribute("position",this._attrPos),this._attrIndex=new b(new Uint16Array(192),1),this.setIndex(this._attrIndex),this._buildIndex(),this.update()}update(){let e=!1;const t=this._shape.radius/this.worldScale;this._currentRadius!==t&&(this._currentRadius=t,e=!0),this._currentOffset.equals(this._shape.offset)||(this._currentOffset.copy(this._shape.offset),e=!0),e&&this._buildPosition()}_buildPosition(){for(let e=0;e<32;e++){const t=e/16*Math.PI;this._attrPos.setXYZ(e,Math.cos(t),Math.sin(t),0),this._attrPos.setXYZ(32+e,0,Math.cos(t),Math.sin(t)),this._attrPos.setXYZ(64+e,Math.sin(t),0,Math.cos(t))}this.scale(this._currentRadius,this._currentRadius,this._currentRadius),this.translate(this._currentOffset.x,this._currentOffset.y,this._currentOffset.z),this._attrPos.needsUpdate=!0}_buildIndex(){for(let e=0;e<32;e++){const t=(e+1)%32;this._attrIndex.setXY(e*2,e,t),this._attrIndex.setXY(64+e*2,32+e,32+t),this._attrIndex.setXY(128+e*2,64+e,64+t)}this._attrIndex.needsUpdate=!0}},$r=new m,He=class extends re{constructor(e){if(super(),this.matrixAutoUpdate=!1,this.collider=e,this.collider.shape instanceof Vn)this._geometry=new Zr(this.collider.shape);else if(this.collider.shape instanceof bn)this._geometry=new qr(this.collider.shape);else if(this.collider.shape instanceof Nn)this._geometry=new Qr(this.collider.shape);else throw new Error("VRMSpringBoneColliderHelper: Unknown collider shape type detected");const t=new Le({color:16711935,depthTest:!1,depthWrite:!1});this._line=new Ze(this._geometry,t),this.add(this._line)}dispose(){this._geometry.dispose()}updateMatrixWorld(e){this.collider.updateWorldMatrix(!0,!1),this.matrix.copy(this.collider.matrixWorld);const t=this.matrix.elements;this._geometry.worldScale=$r.set(t[0],t[1],t[2]).length(),this._geometry.update(),super.updateMatrixWorld(e)}},Jr=class extends ${constructor(e){super(),this.worldScale=1,this._currentRadius=0,this._currentTail=new m,this._springBone=e,this._attrPos=new b(new Float32Array(294),3),this.setAttribute("position",this._attrPos),this._attrIndex=new b(new Uint16Array(194),1),this.setIndex(this._attrIndex),this._buildIndex(),this.update()}update(){let e=!1;const t=this._springBone.settings.hitRadius/this.worldScale;this._currentRadius!==t&&(this._currentRadius=t,e=!0),this._currentTail.equals(this._springBone.initialLocalChildPosition)||(this._currentTail.copy(this._springBone.initialLocalChildPosition),e=!0),e&&this._buildPosition()}_buildPosition(){for(let e=0;e<32;e++){const t=e/16*Math.PI;this._attrPos.setXYZ(e,Math.cos(t),Math.sin(t),0),this._attrPos.setXYZ(32+e,0,Math.cos(t),Math.sin(t)),this._attrPos.setXYZ(64+e,Math.sin(t),0,Math.cos(t))}this.scale(this._currentRadius,this._currentRadius,this._currentRadius),this.translate(this._currentTail.x,this._currentTail.y,this._currentTail.z),this._attrPos.setXYZ(96,0,0,0),this._attrPos.setXYZ(97,this._currentTail.x,this._currentTail.y,this._currentTail.z),this._attrPos.needsUpdate=!0}_buildIndex(){for(let e=0;e<32;e++){const t=(e+1)%32;this._attrIndex.setXY(e*2,e,t),this._attrIndex.setXY(64+e*2,32+e,32+t),this._attrIndex.setXY(128+e*2,64+e,64+t)}this._attrIndex.setXY(192,96,97),this._attrIndex.needsUpdate=!0}},Kr=new m,eo=class extends re{constructor(e){super(),this.matrixAutoUpdate=!1,this.springBone=e,this._geometry=new Jr(this.springBone);const t=new Le({color:16776960,depthTest:!1,depthWrite:!1});this._line=new Ze(this._geometry,t),this.add(this._line)}dispose(){this._geometry.dispose()}updateMatrixWorld(e){this.springBone.bone.updateWorldMatrix(!0,!1),this.matrix.copy(this.springBone.bone.matrixWorld);const t=this.matrix.elements;this._geometry.worldScale=Kr.set(t[0],t[1],t[2]).length(),this._geometry.update(),super.updateMatrixWorld(e)}},We=class extends Ee{constructor(e){super(),this.colliderMatrix=new Z,this.shape=e}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),to(this.colliderMatrix,this.matrixWorld,this.shape.offset)}};function to(e,t,n){const i=t.elements;e.copy(t),n&&(e.elements[12]=i[0]*n.x+i[4]*n.y+i[8]*n.z+i[12],e.elements[13]=i[1]*n.x+i[5]*n.y+i[9]*n.z+i[13],e.elements[14]=i[2]*n.x+i[6]*n.y+i[10]*n.z+i[14])}var no=new Z;function io(e){return e.invert?e.invert():e.getInverse(no.copy(e)),e}var ro=class{constructor(e){this._inverseCache=new Z,this._shouldUpdateInverse=!0,this.matrix=e;const t={set:(n,i,r)=>(this._shouldUpdateInverse=!0,n[i]=r,!0)};this._originalElements=e.elements,e.elements=new Proxy(e.elements,t)}get inverse(){return this._shouldUpdateInverse&&(io(this._inverseCache.copy(this.matrix)),this._shouldUpdateInverse=!1),this._inverseCache}revert(){this.matrix.elements=this._originalElements}},ke=new Z,te=new m,he=new m,ce=new m,pe=new m,oo=new Z,so=class{constructor(e,t,n={},i=[]){this._currentTail=new m,this._prevTail=new m,this._boneAxis=new m,this._worldSpaceBoneLength=0,this._center=null,this._initialLocalMatrix=new Z,this._initialLocalRotation=new R,this._initialLocalChildPosition=new m;var r,o,a,l,s,u;this.bone=e,this.bone.matrixAutoUpdate=!1,this.child=t,this.settings={hitRadius:(r=n.hitRadius)!=null?r:0,stiffness:(o=n.stiffness)!=null?o:1,gravityPower:(a=n.gravityPower)!=null?a:0,gravityDir:(s=(l=n.gravityDir)==null?void 0:l.clone())!=null?s:new m(0,-1,0),dragForce:(u=n.dragForce)!=null?u:.4},this.colliderGroups=i}get dependencies(){const e=new Set,t=this.bone.parent;t&&e.add(t);for(let n=0;n<this.colliderGroups.length;n++)for(let i=0;i<this.colliderGroups[n].colliders.length;i++)e.add(this.colliderGroups[n].colliders[i]);return e}get center(){return this._center}set center(e){var t;(t=this._center)!=null&&t.userData.inverseCacheProxy&&(this._center.userData.inverseCacheProxy.revert(),delete this._center.userData.inverseCacheProxy),this._center=e,this._center&&(this._center.userData.inverseCacheProxy||(this._center.userData.inverseCacheProxy=new ro(this._center.matrixWorld)))}get initialLocalChildPosition(){return this._initialLocalChildPosition}get _parentMatrixWorld(){return this.bone.parent?this.bone.parent.matrixWorld:ke}setInitState(){this._initialLocalMatrix.copy(this.bone.matrix),this._initialLocalRotation.copy(this.bone.quaternion),this.child?this._initialLocalChildPosition.copy(this.child.position):this._initialLocalChildPosition.copy(this.bone.position).normalize().multiplyScalar(.07);const e=this._getMatrixWorldToCenter();this.bone.localToWorld(this._currentTail.copy(this._initialLocalChildPosition)).applyMatrix4(e),this._prevTail.copy(this._currentTail),this._boneAxis.copy(this._initialLocalChildPosition).normalize()}reset(){this.bone.quaternion.copy(this._initialLocalRotation),this.bone.updateMatrix(),this.bone.matrixWorld.multiplyMatrices(this._parentMatrixWorld,this.bone.matrix);const e=this._getMatrixWorldToCenter();this.bone.localToWorld(this._currentTail.copy(this._initialLocalChildPosition)).applyMatrix4(e),this._prevTail.copy(this._currentTail)}update(e){if(e<=0)return;this._calcWorldSpaceBoneLength();const t=he.copy(this._boneAxis).transformDirection(this._initialLocalMatrix).transformDirection(this._parentMatrixWorld);pe.copy(this._currentTail).add(te.subVectors(this._currentTail,this._prevTail).multiplyScalar(1-this.settings.dragForce)).applyMatrix4(this._getMatrixCenterToWorld()).addScaledVector(t,this.settings.stiffness*e).addScaledVector(this.settings.gravityDir,this.settings.gravityPower*e),ce.setFromMatrixPosition(this.bone.matrixWorld),pe.sub(ce).normalize().multiplyScalar(this._worldSpaceBoneLength).add(ce),this._collision(pe),this._prevTail.copy(this._currentTail),this._currentTail.copy(pe).applyMatrix4(this._getMatrixWorldToCenter());const n=oo.multiplyMatrices(this._parentMatrixWorld,this._initialLocalMatrix).invert();this.bone.quaternion.setFromUnitVectors(this._boneAxis,te.copy(pe).applyMatrix4(n).normalize()).premultiply(this._initialLocalRotation),this.bone.updateMatrix(),this.bone.matrixWorld.multiplyMatrices(this._parentMatrixWorld,this.bone.matrix)}_collision(e){for(let t=0;t<this.colliderGroups.length;t++)for(let n=0;n<this.colliderGroups[t].colliders.length;n++){const i=this.colliderGroups[t].colliders[n],r=i.shape.calculateCollision(i.colliderMatrix,e,this.settings.hitRadius,te);if(r<0){e.addScaledVector(te,-r),e.sub(ce);const o=e.length();e.multiplyScalar(this._worldSpaceBoneLength/o).add(ce)}}}_calcWorldSpaceBoneLength(){te.setFromMatrixPosition(this.bone.matrixWorld),this.child?he.setFromMatrixPosition(this.child.matrixWorld):(he.copy(this._initialLocalChildPosition),he.applyMatrix4(this.bone.matrixWorld)),this._worldSpaceBoneLength=te.sub(he).length()}_getMatrixCenterToWorld(){return this._center?this._center.matrixWorld:ke}_getMatrixWorldToCenter(){return this._center?this._center.userData.inverseCacheProxy.inverse:ke}};function ao(e,t){const n=[];let i=e;for(;i!==null;)n.unshift(i),i=i.parent;n.forEach(r=>{t(r)})}function qe(e,t){e.children.forEach(n=>{t(n)||qe(n,t)})}function lo(e){var t;const n=new Map;for(const i of e){let r=i;do{const o=((t=n.get(r))!=null?t:0)+1;if(o===e.size)return r;n.set(r,o),r=r.parent}while(r!==null)}return null}var fn=class{constructor(){this._joints=new Set,this._sortedJoints=[],this._hasWarnedCircularDependency=!1,this._ancestors=[],this._objectSpringBonesMap=new Map,this._isSortedJointsDirty=!1,this._relevantChildrenUpdated=this._relevantChildrenUpdated.bind(this)}get joints(){return this._joints}get springBones(){return console.warn("VRMSpringBoneManager: springBones is deprecated. use joints instead."),this._joints}get colliderGroups(){const e=new Set;return this._joints.forEach(t=>{t.colliderGroups.forEach(n=>{e.add(n)})}),Array.from(e)}get colliders(){const e=new Set;return this.colliderGroups.forEach(t=>{t.colliders.forEach(n=>{e.add(n)})}),Array.from(e)}addJoint(e){this._joints.add(e);let t=this._objectSpringBonesMap.get(e.bone);t==null&&(t=new Set,this._objectSpringBonesMap.set(e.bone,t)),t.add(e),this._isSortedJointsDirty=!0}addSpringBone(e){console.warn("VRMSpringBoneManager: addSpringBone() is deprecated. use addJoint() instead."),this.addJoint(e)}deleteJoint(e){this._joints.delete(e),this._objectSpringBonesMap.get(e.bone).delete(e),this._isSortedJointsDirty=!0}deleteSpringBone(e){console.warn("VRMSpringBoneManager: deleteSpringBone() is deprecated. use deleteJoint() instead."),this.deleteJoint(e)}setInitState(){this._sortJoints();for(let e=0;e<this._sortedJoints.length;e++){const t=this._sortedJoints[e];t.bone.updateMatrix(),t.bone.updateWorldMatrix(!1,!1),t.setInitState()}}reset(){this._sortJoints();for(let e=0;e<this._sortedJoints.length;e++){const t=this._sortedJoints[e];t.bone.updateMatrix(),t.bone.updateWorldMatrix(!1,!1),t.reset()}}update(e){this._sortJoints();for(let t=0;t<this._ancestors.length;t++)this._ancestors[t].updateWorldMatrix(t===0,!1);for(let t=0;t<this._sortedJoints.length;t++){const n=this._sortedJoints[t];n.bone.updateMatrix(),n.bone.updateWorldMatrix(!1,!1),n.update(e),qe(n.bone,this._relevantChildrenUpdated)}}_sortJoints(){if(!this._isSortedJointsDirty)return;const e=[],t=new Set,n=new Set,i=new Set;for(const o of this._joints)this._insertJointSort(o,t,n,e,i);this._sortedJoints=e;const r=lo(i);this._ancestors=[],r&&(this._ancestors.push(r),qe(r,o=>{var a,l;return((l=(a=this._objectSpringBonesMap.get(o))==null?void 0:a.size)!=null?l:0)>0?!0:(this._ancestors.push(o),!1)})),this._isSortedJointsDirty=!1}_insertJointSort(e,t,n,i,r){if(n.has(e))return;if(t.has(e)){this._hasWarnedCircularDependency||(console.warn("VRMSpringBoneManager: Circular dependency detected"),this._hasWarnedCircularDependency=!0);return}t.add(e);const o=e.dependencies;for(const a of o){let l=!1,s=null;ao(a,u=>{const d=this._objectSpringBonesMap.get(u);if(d)for(const h of d)l=!0,this._insertJointSort(h,t,n,i,r);else l||(s=u)}),s&&r.add(s)}i.push(e),n.add(e)}_relevantChildrenUpdated(e){var t,n;return((n=(t=this._objectSpringBonesMap.get(e))==null?void 0:t.size)!=null?n:0)>0?!0:(e.updateWorldMatrix(!1,!1),!1)}},_n="VRMC_springBone_extended_collider",uo=new Set(["1.0","1.0-beta"]),ho=new Set(["1.0"]),Dn=class ie{get name(){return ie.EXTENSION_NAME}constructor(t,n){var i;this.parser=t,this.jointHelperRoot=n?.jointHelperRoot,this.colliderHelperRoot=n?.colliderHelperRoot,this.useExtendedColliders=(i=n?.useExtendedColliders)!=null?i:!0}afterRoot(t){return Re(this,null,function*(){t.userData.vrmSpringBoneManager=yield this._import(t)})}_import(t){return Re(this,null,function*(){const n=yield this._v1Import(t);if(n!=null)return n;const i=yield this._v0Import(t);return i??null})}_v1Import(t){return Re(this,null,function*(){var n,i,r,o,a;const l=t.parser.json;if(!(((n=l.extensionsUsed)==null?void 0:n.indexOf(ie.EXTENSION_NAME))!==-1))return null;const u=new fn,d=yield t.parser.getDependencies("node"),h=(i=l.extensions)==null?void 0:i[ie.EXTENSION_NAME];if(!h)return null;const f=h.specVersion;if(!uo.has(f))return console.warn(`VRMSpringBoneLoaderPlugin: Unknown ${ie.EXTENSION_NAME} specVersion "${f}"`),null;const c=(r=h.colliders)==null?void 0:r.map((p,v)=>{var g,L,w,y,M,x,S,A,O,E,P,C,z,oe,se;const k=d[p.node];if(k==null)return console.warn(`VRMSpringBoneLoaderPlugin: The collider #${v} attempted to use the node #${p.node} but not found`),null;const D=p.shape,J=(g=p.extensions)==null?void 0:g[_n];if(this.useExtendedColliders&&J!=null){const ae=J.specVersion;if(!ho.has(ae))console.warn(`VRMSpringBoneLoaderPlugin: Unknown ${_n} specVersion "${ae}". Fallbacking to the ${ie.EXTENSION_NAME} definition`);else{const U=J.shape;if(U.sphere)return this._importSphereCollider(k,{offset:new m().fromArray((L=U.sphere.offset)!=null?L:[0,0,0]),radius:(w=U.sphere.radius)!=null?w:0,inside:(y=U.sphere.inside)!=null?y:!1});if(U.capsule)return this._importCapsuleCollider(k,{offset:new m().fromArray((M=U.capsule.offset)!=null?M:[0,0,0]),radius:(x=U.capsule.radius)!=null?x:0,tail:new m().fromArray((S=U.capsule.tail)!=null?S:[0,0,0]),inside:(A=U.capsule.inside)!=null?A:!1});if(U.plane)return this._importPlaneCollider(k,{offset:new m().fromArray((O=U.plane.offset)!=null?O:[0,0,0]),normal:new m().fromArray((E=U.plane.normal)!=null?E:[0,0,1])})}}if(D.sphere)return this._importSphereCollider(k,{offset:new m().fromArray((P=D.sphere.offset)!=null?P:[0,0,0]),radius:(C=D.sphere.radius)!=null?C:0,inside:!1});if(D.capsule)return this._importCapsuleCollider(k,{offset:new m().fromArray((z=D.capsule.offset)!=null?z:[0,0,0]),radius:(oe=D.capsule.radius)!=null?oe:0,tail:new m().fromArray((se=D.capsule.tail)!=null?se:[0,0,0]),inside:!1});throw new Error(`VRMSpringBoneLoaderPlugin: The collider #${v} has no valid shape`)}),_=(o=h.colliderGroups)==null?void 0:o.map((p,v)=>{var g;return{colliders:((g=p.colliders)!=null?g:[]).flatMap(w=>{const y=c?.[w];return y??(console.warn(`VRMSpringBoneLoaderPlugin: The colliderGroup #${v} attempted to use a collider #${w} but not found`),[])}),name:p.name}});return(a=h.springs)==null||a.forEach((p,v)=>{var g;const L=p.joints,w=(g=p.colliderGroups)==null?void 0:g.map(x=>{const S=_?.[x];if(S==null)throw new Error(`VRMSpringBoneLoaderPlugin: The spring #${v} attempted to use a colliderGroup ${x} but not found`);return S}),y=p.center!=null?d[p.center]:void 0;let M;L.forEach(x=>{if(M){const S=M.node,A=d[S],O=x.node,E=d[O],P={hitRadius:M.hitRadius,dragForce:M.dragForce,gravityPower:M.gravityPower,stiffness:M.stiffness,gravityDir:M.gravityDir!=null?new m().fromArray(M.gravityDir):void 0},C=this._importJoint(A,E,P,w);y&&(C.center=y),u.addJoint(C)}M=x})}),u.setInitState(),u})}_v0Import(t){return Re(this,null,function*(){var n,i,r;const o=t.parser.json;if(!(((n=o.extensionsUsed)==null?void 0:n.indexOf("VRM"))!==-1))return null;const l=(i=o.extensions)==null?void 0:i.VRM,s=l?.secondaryAnimation;if(!s)return null;const u=s?.boneGroups;if(!u)return null;const d=new fn,h=yield t.parser.getDependencies("node"),f=(r=s.colliderGroups)==null?void 0:r.map(c=>{var _;const p=h[c.node];return{colliders:((_=c.colliders)!=null?_:[]).map((g,L)=>{var w,y,M;const x=new m(0,0,0);return g.offset&&x.set((w=g.offset.x)!=null?w:0,(y=g.offset.y)!=null?y:0,g.offset.z?-g.offset.z:0),this._importSphereCollider(p,{offset:x,radius:(M=g.radius)!=null?M:0,inside:!1})})}});return u?.forEach((c,_)=>{const p=c.bones;p&&p.forEach(v=>{var g,L,w,y;const M=h[v],x=new m;c.gravityDir?x.set((g=c.gravityDir.x)!=null?g:0,(L=c.gravityDir.y)!=null?L:0,(w=c.gravityDir.z)!=null?w:0):x.set(0,-1,0);const S=c.center!=null?h[c.center]:void 0,A={hitRadius:c.hitRadius,dragForce:c.dragForce,gravityPower:c.gravityPower,stiffness:c.stiffiness,gravityDir:x},O=(y=c.colliderGroups)==null?void 0:y.map(E=>{const P=f?.[E];if(P==null)throw new Error(`VRMSpringBoneLoaderPlugin: The spring #${_} attempted to use a colliderGroup ${E} but not found`);return P});M.traverse(E=>{var P;const C=(P=E.children[0])!=null?P:null,z=this._importJoint(E,C,A,O);S&&(z.center=S),d.addJoint(z)})})}),t.scene.updateMatrixWorld(),d.setInitState(),d})}_importJoint(t,n,i,r){const o=new so(t,n,i,r);if(this.jointHelperRoot){const a=new eo(o);this.jointHelperRoot.add(a),a.renderOrder=this.jointHelperRoot.renderOrder}return o}_importSphereCollider(t,n){const i=new Vn(n),r=new We(i);if(t.add(r),this.colliderHelperRoot){const o=new He(r);this.colliderHelperRoot.add(o),o.renderOrder=this.colliderHelperRoot.renderOrder}return r}_importCapsuleCollider(t,n){const i=new bn(n),r=new We(i);if(t.add(r),this.colliderHelperRoot){const o=new He(r);this.colliderHelperRoot.add(o),o.renderOrder=this.colliderHelperRoot.renderOrder}return r}_importPlaneCollider(t,n){const i=new Nn(n),r=new We(i);if(t.add(r),this.colliderHelperRoot){const o=new He(r);this.colliderHelperRoot.add(o),o.renderOrder=this.colliderHelperRoot.renderOrder}return r}};Dn.EXTENSION_NAME="VRMC_springBone";var co=Dn,vo=class{get name(){return"VRMLoaderPlugin"}constructor(e,t){var n,i,r,o,a,l,s,u,d,h;this.parser=e;const f=t?.helperRoot,c=t?.autoUpdateHumanBones;this.expressionPlugin=(n=t?.expressionPlugin)!=null?n:new Ai(e),this.firstPersonPlugin=(i=t?.firstPersonPlugin)!=null?i:new Oi(e),this.humanoidPlugin=(r=t?.humanoidPlugin)!=null?r:new Di(e,{helperRoot:f,autoUpdateHumanBones:c}),this.lookAtPlugin=(o=t?.lookAtPlugin)!=null?o:new Ji(e,{helperRoot:f}),this.metaPlugin=(a=t?.metaPlugin)!=null?a:new tr(e),this.mtoonMaterialPlugin=(l=t?.mtoonMaterialPlugin)!=null?l:new _r(e),this.materialsHDREmissiveMultiplierPlugin=(s=t?.materialsHDREmissiveMultiplierPlugin)!=null?s:new gr(e),this.materialsV0CompatPlugin=(u=t?.materialsV0CompatPlugin)!=null?u:new Sr(e),this.springBonePlugin=(d=t?.springBonePlugin)!=null?d:new co(e,{colliderHelperRoot:f,jointHelperRoot:f}),this.nodeConstraintPlugin=(h=t?.nodeConstraintPlugin)!=null?h:new Gr(e,{helperRoot:f})}beforeRoot(){return Me(this,null,function*(){yield this.materialsV0CompatPlugin.beforeRoot(),yield this.mtoonMaterialPlugin.beforeRoot()})}loadMesh(e){return Me(this,null,function*(){return yield this.mtoonMaterialPlugin.loadMesh(e)})}getMaterialType(e){const t=this.mtoonMaterialPlugin.getMaterialType(e);return t??null}extendMaterialParams(e,t){return Me(this,null,function*(){yield this.materialsHDREmissiveMultiplierPlugin.extendMaterialParams(e,t),yield this.mtoonMaterialPlugin.extendMaterialParams(e,t)})}afterRoot(e){return Me(this,null,function*(){yield this.metaPlugin.afterRoot(e),yield this.humanoidPlugin.afterRoot(e),yield this.expressionPlugin.afterRoot(e),yield this.lookAtPlugin.afterRoot(e),yield this.firstPersonPlugin.afterRoot(e),yield this.springBonePlugin.afterRoot(e),yield this.nodeConstraintPlugin.afterRoot(e),yield this.mtoonMaterialPlugin.afterRoot(e);const t=e.userData.vrmMeta,n=e.userData.vrmHumanoid;if(t&&n){const i=new ir({scene:e.scene,expressionManager:e.userData.vrmExpressionManager,firstPerson:e.userData.vrmFirstPerson,humanoid:n,lookAt:e.userData.vrmLookAt,meta:t,materials:e.userData.vrmMToonMaterials,springBoneManager:e.userData.vrmSpringBoneManager,nodeConstraintManager:e.userData.vrmNodeConstraintManager});e.userData.vrm=i}})}};export{mr as MToonMaterial,cr as MToonMaterialDebugMode,_r as MToonMaterialLoaderPlugin,ln as MToonMaterialOutlineWidthMode,ir as VRM,Nr as VRMAimConstraint,nr as VRMCore,Nt as VRMExpression,Ai as VRMExpressionLoaderPlugin,Ft as VRMExpressionManager,Bt as VRMExpressionMaterialColorBind,ue as VRMExpressionMaterialColorType,Ht as VRMExpressionMorphTargetBind,ze as VRMExpressionPresetName,kt as VRMExpressionTextureTransformBind,zt as VRMFirstPerson,Oi as VRMFirstPersonLoaderPlugin,Ce as VRMHumanBoneList,Ci as VRMHumanBoneParentMap,qt as VRMHumanoid,Gt as VRMHumanoidHelper,Di as VRMHumanoidLoaderPlugin,vo as VRMLoaderPlugin,Qi as VRMLookAt,we as VRMLookAtBoneApplier,Ge as VRMLookAtExpressionApplier,Wi as VRMLookAtHelper,Ji as VRMLookAtLoaderPlugin,rn as VRMLookAtRangeMap,tr as VRMMetaLoaderPlugin,Je as VRMNodeConstraint,De as VRMNodeConstraintHelper,Gr as VRMNodeConstraintLoaderPlugin,Dr as VRMNodeConstraintManager,Ni as VRMRequiredHumanBoneName,Xr as VRMRollConstraint,Hr as VRMRotationConstraint,We as VRMSpringBoneCollider,He as VRMSpringBoneColliderHelper,Ke as VRMSpringBoneColliderShape,bn as VRMSpringBoneColliderShapeCapsule,Nn as VRMSpringBoneColliderShapePlane,Vn as VRMSpringBoneColliderShapeSphere,so as VRMSpringBoneJoint,eo as VRMSpringBoneJointHelper,co as VRMSpringBoneLoaderPlugin,fn as VRMSpringBoneManager};
