(function(){
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const run=()=>{if(window.AOS)AOS.init({duration:850,easing:'ease-out-cubic',once:true,offset:70,disable:reduce});};
if(window.AOS) run(); else window.addEventListener('load',run);
document.querySelectorAll('.sp-photo[data-src]').forEach(el=>{
const img=new Image(); img.onload=()=>{el.style.backgroundImage=`url("${el.dataset.src}")`;el.classList.add('loaded')}; img.src=el.dataset.src;
});
})();
