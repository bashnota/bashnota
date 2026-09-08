import{al as a}from"./index-C5OMlyxE.js";/**
 * @license lucide-vue-next v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
 * @license lucide-vue-next v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var o={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};/**
 * @license lucide-vue-next v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=({size:e,strokeWidth:t=2,absoluteStrokeWidth:r,color:s,iconNode:n,name:i,class:w,...l},{slots:c})=>a("svg",{...o,width:e||o.width,height:e||o.height,stroke:s||o.stroke,"stroke-width":r?Number(t)*24/Number(e):t,class:["lucide",`lucide-${d(i??"icon")}`],...l},[...n.map(u=>a(...u)),...c.default?[c.default()]:[]]);/**
 * @license lucide-vue-next v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=(e,t)=>(r,{slots:s})=>a(h,{...r,iconNode:t,name:e},s);export{m as c};
