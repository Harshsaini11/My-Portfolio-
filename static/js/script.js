const menuBtn = document.querySelector(".menu-btn");
const navLinks = document.querySelector(".nav-links");

if (menuBtn && navLinks) {
    menuBtn.addEventListener("click", () => {
        navLinks.classList.toggle("active");
        menuBtn.innerHTML = navLinks.classList.contains("active")
            ? '<i class="fa-solid fa-xmark"></i>'
            : '<i class="fa-solid fa-bars"></i>';
    });

    document.querySelectorAll(".nav-links a").forEach(link => {
        link.addEventListener("click", () => {
            navLinks.classList.remove("active");
            menuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
        });
    });
}

// TYPING EFFECT
const typingText = document.querySelector(".typing");
const roles = [
    "Full Stack Developer",
    "Python Developer",
    "AI/ML Developer",
    "Web Developer",
    "Software Developer"
];

let roleIndex = 0;
let charIndex = 0;
let deleting = false;

function typingAnimation(){
    if (!typingText) return;
    let currentRole = roles[roleIndex];

    if(!deleting){
        typingText.textContent = currentRole.substring(0,charIndex++);
        if(charIndex > currentRole.length){
            deleting = true;
            setTimeout(typingAnimation,1000);
            return;
        }
    } else {
        typingText.textContent = currentRole.substring(0,charIndex--);
        if(charIndex < 0){
            deleting = false;
            roleIndex++;
            if(roleIndex >= roles.length){
                roleIndex = 0;
            }
        }
    }
    setTimeout(typingAnimation,100);
}

typingAnimation();

// THEME TOGGLE
const themeBtn = document.getElementById("theme-toggle");
if (themeBtn) {
    themeBtn.addEventListener("click",()=>{
        document.body.classList.toggle("dark");
        const icon = themeBtn.querySelector("i");
        if(document.body.classList.contains("dark")){
            icon.classList.remove("fa-moon");
            icon.classList.add("fa-sun");
            localStorage.setItem("theme", "dark");
        } else {
            icon.classList.remove("fa-sun");
            icon.classList.add("fa-moon");
            localStorage.setItem("theme", "light");
        }
    });

    if(localStorage.getItem("theme") === "dark"){
        document.body.classList.add("dark");
        themeBtn.querySelector("i").classList.replace("fa-moon", "fa-sun");
    }
}

// BACK TO TOP BUTTON
const topBtn = document.getElementById("back-to-top");
if (topBtn) {
    window.addEventListener("scroll",()=>{
        if(window.scrollY > 400){
            topBtn.style.display="block";
        } else {
            topBtn.style.display="none";
        }
    });

    topBtn.addEventListener("click",()=>{
        window.scrollTo({ top:0, behavior:"smooth" });
    });
}

// ANIMATED COUNTER
const counters = document.querySelectorAll("[data-count]");
let counterStarted = false;

function startCounter(){
    const statsSection = document.querySelector(".stats");
    if (!statsSection) return;

    const position = statsSection.getBoundingClientRect().top;
    if(position < window.innerHeight && !counterStarted){
        counters.forEach(counter => {
            let target = Number(counter.dataset.count);
            let count = 0;
            let speed = target / 100;

            const updateCounter = () => {
                if(count < target){
                    count += speed;
                    counter.innerText = Math.ceil(count);
                    setTimeout(updateCounter, 20);
                } else {
                    counter.innerText = target;
                }
            };
            updateCounter();
        });
        counterStarted = true;
    }
}

window.addEventListener("scroll", startCounter);