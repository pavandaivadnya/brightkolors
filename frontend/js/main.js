const $=(s,p=document)=>p.querySelector(s),$$=(s,p=document)=>[...p.querySelectorAll(s)];
window.addEventListener("load",()=>setTimeout(()=>$(".page-loader")?.remove(),650));

const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");observer.unobserve(e.target)}}),{threshold:.12});
$$(".reveal").forEach(e=>observer.observe(e));

const mobileBtn=$(".mobile-menu"),mobileNav=$(".mobile-nav");
mobileBtn?.addEventListener("click",()=>mobileNav.classList.toggle("open"));
$$(".mobile-nav a").forEach(a=>a.addEventListener("click",()=>mobileNav.classList.remove("open")));

const heroSlides=$$(".hero-slide"), heroCount=$("#heroCount");
if(heroSlides.length){let i=0;setInterval(()=>{heroSlides[i].classList.remove("active");i=(i+1)%heroSlides.length;heroSlides[i].classList.add("active");if(heroCount)heroCount.textContent=String(i+1).padStart(2,"0")},4800)}

$$("[data-cursor]").forEach(el=>{const c=$(".cursor-label");el.addEventListener("mouseenter",()=>c?.classList.add("show"));el.addEventListener("mouseleave",()=>c?.classList.remove("show"))});
window.addEventListener("pointermove",e=>{const c=$(".cursor-label");if(c){c.style.left=e.clientX+"px";c.style.top=e.clientY+"px"}});

const slots={
  ".slot-hero-1":"assets/images/hero-1.jpg",".slot-hero-2":"assets/images/hero-2.jpg",".slot-hero-3":"assets/images/hero-3.jpg",
  ".slot-acp":"assets/images/acp-1.jpg",".slot-led":"assets/images/led-1.jpg",".slot-inshop":"assets/images/inshop-1.jpg",
  ".slot-reflective":"assets/images/reflective-1.jpg",".slot-corporate":"assets/images/corporate-1.jpg",".slot-nameplates":"assets/images/nameplates-1.jpg",
  ".slot-work-1":"assets/images/work-1.jpg",".slot-work-2":"assets/images/work-2.jpg",".slot-work-3":"assets/images/work-3.jpg",
  ".slot-infra-1":"assets/images/infrastructure-1.jpg",".slot-infra-2":"assets/images/infrastructure-2.jpg",".slot-infra-3":"assets/images/infrastructure-3.jpg",
  ".slot-map":"assets/images/location.jpg",".slot-contact-map":"assets/images/location.jpg",
  ".slot-p1":"assets/images/work-1.jpg",".slot-p2":"assets/images/work-2.jpg",".slot-p3":"assets/images/led-1.jpg",".slot-p4":"assets/images/corporate-1.jpg",".slot-p5":"assets/images/acp-1.jpg"
};
Object.entries(slots).forEach(([selector,url])=>{$$(selector).forEach(el=>{const img=new Image();img.onload=()=>{el.style.backgroundImage=`url("${url}")`;el.classList.add("has-image")};img.src=url})});

$$(".portfolio-filter button").forEach(btn=>btn.addEventListener("click",()=>{const f=btn.dataset.filter;$$(".portfolio-filter button").forEach(b=>b.classList.remove("active"));btn.classList.add("active");$$(".portfolio-card").forEach(card=>card.style.display=f==="all"||card.dataset.category===f?"block":"none")}));

// Lightweight pointer parallax for the main hero.
const hero=$(".hero");hero?.addEventListener("pointermove",e=>{const x=(e.clientX/innerWidth-.5)*10,y=(e.clientY/innerHeight-.5)*8;$$(".hero-slide",hero).forEach(s=>s.style.transform=`scale(1.04) translate(${x}px,${y}px)`)});hero?.addEventListener("pointerleave",()=>$$(".hero-slide",hero).forEach(s=>s.style.transform=""));
