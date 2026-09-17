/* MOBILE NAVIGATION */

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

menuToggle.addEventListener("click", () => {

    navLinks.classList.toggle("active");

    const icon = menuToggle.querySelector("i");

    if (navLinks.classList.contains("active")) {
        icon.classList.remove("fa-bars");
        icon.classList.add("fa-xmark");
    } else {
        icon.classList.remove("fa-xmark");
        icon.classList.add("fa-bars");
    }

});


document.querySelectorAll(".nav-links a").forEach(link => {

    link.addEventListener("click", () => {

        navLinks.classList.remove("active");

        const icon = menuToggle.querySelector("i");

        icon.classList.remove("fa-xmark");
        icon.classList.add("fa-bars");

    });

});


/* CURRENT YEAR */

const currentYear = document.getElementById("currentYear");

currentYear.textContent = new Date().getFullYear();


/* PREVENT PAST EVENT DATES */

const eventDateInput = document.getElementById("eventDate");

const today = new Date();

const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, "0");
const day = String(today.getDate()).padStart(2, "0");

eventDateInput.min = `${year}-${month}-${day}`;


/* SCROLL TO TOP */

const scrollTopButton = document.getElementById("scrollTop");

window.addEventListener("scroll", () => {

    if (window.scrollY > 600) {
        scrollTopButton.classList.add("show");
    } else {
        scrollTopButton.classList.remove("show");
    }

});


scrollTopButton.addEventListener("click", () => {

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

});


/* QUOTE FORM TO WHATSAPP */

const quoteForm = document.getElementById("quoteForm");

quoteForm.addEventListener("submit", function(event) {

    event.preventDefault();

    const fullName =
        document.getElementById("fullName").value.trim();

    const phone =
        document.getElementById("phone").value.trim();

    const email =
        document.getElementById("email").value.trim();

    const eventType =
        document.getElementById("eventType").value;

    const eventDate =
        document.getElementById("eventDate").value;

    const eventLocation =
        document.getElementById("eventLocation").value.trim();

    const guestNumber =
        document.getElementById("guestNumber").value;

    const setup =
        document.getElementById("setup").value;

    const menuDetails =
        document.getElementById("menuDetails").value.trim();

    const dietary =
        document.getElementById("dietary").value.trim();

    const additional =
        document.getElementById("additional").value.trim();


    const selectedMenu = [];

    document
        .querySelectorAll('input[name="menu"]:checked')
        .forEach(item => {
            selectedMenu.push(item.value);
        });


    let formattedDate = eventDate;

    if (eventDate) {

        const date = new Date(eventDate + "T00:00:00");

        formattedDate = date.toLocaleDateString("en-KE", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });

    }


    const message = `
Hello Joelle's Catering Services 👋

I would like to request a catering quotation.

CUSTOMER DETAILS

Name: ${fullName}

Phone / WhatsApp: ${phone}

Email: ${email || "Not provided"}

EVENT DETAILS

Event Type: ${eventType}

Event Date: ${formattedDate}

Event Location: ${eventLocation}

Estimated Guests: ${guestNumber}

CATERING REQUIREMENTS

Menu Categories: ${
    selectedMenu.length > 0
        ? selectedMenu.join(", ")
        : "Not specified"
}

Preferred Foods / Menu:
${menuDetails || "Not specified"}

Catering Setup:
${setup || "Not specified"}

Special Dietary Requirements:
${dietary || "None specified"}

Additional Requests:
${additional || "None"}

Please provide me with a customized quotation for this event.

Thank you.
    `.trim();


    const joelleWhatsApp = "254722785377";

    const encodedMessage = encodeURIComponent(message);

    const whatsappURL =
        `https://wa.me/${joelleWhatsApp}?text=${encodedMessage}`;

    window.open(whatsappURL, "_blank");

});


/* HERO SLIDESHOW */

const heroSlider =
    document.querySelector(".hero-slider");

const heroSlides =
    document.querySelectorAll(".hero-slide");

const heroDots =
    document.querySelectorAll(".hero-dot");

const heroPrev =
    document.getElementById("heroPrev");

const heroNext =
    document.getElementById("heroNext");


let currentHeroSlide = 0;
let heroSlideTimer;


function showHeroSlide(index) {

    if (index >= heroSlides.length) {
        index = 0;
    }

    if (index < 0) {
        index = heroSlides.length - 1;
    }

    heroSlides.forEach(slide => {
        slide.classList.remove("active");
    });

    heroDots.forEach(dot => {
        dot.classList.remove("active");
    });

    heroSlides[index].classList.add("active");
    heroDots[index].classList.add("active");

    currentHeroSlide = index;

}


function nextHeroSlide() {
    showHeroSlide(currentHeroSlide + 1);
}


function previousHeroSlide() {
    showHeroSlide(currentHeroSlide - 1);
}


function startHeroSlideshow() {

    clearInterval(heroSlideTimer);

    heroSlideTimer =
        setInterval(nextHeroSlide, 5000);

}


heroNext.addEventListener("click", () => {

    nextHeroSlide();
    startHeroSlideshow();

});


heroPrev.addEventListener("click", () => {

    previousHeroSlide();
    startHeroSlideshow();

});


heroDots.forEach(dot => {

    dot.addEventListener("click", () => {

        const slideNumber =
            Number(dot.dataset.slide);

        showHeroSlide(slideNumber);
        startHeroSlideshow();

    });

});


/* MOBILE HERO SWIPE */

let touchStartX = 0;
let touchEndX = 0;

heroSlider.addEventListener(
    "touchstart",
    event => {

        touchStartX =
            event.changedTouches[0].screenX;

    },
    {
        passive: true
    }
);


heroSlider.addEventListener(
    "touchend",
    event => {

        touchEndX =
            event.changedTouches[0].screenX;

        handleHeroSwipe();

    },
    {
        passive: true
    }
);


function handleHeroSwipe() {

    const swipeDistance =
        touchEndX - touchStartX;

    if (Math.abs(swipeDistance) < 50) {
        return;
    }

    if (swipeDistance < 0) {
        nextHeroSlide();
    }

    if (swipeDistance > 0) {
        previousHeroSlide();
    }

    startHeroSlideshow();

}


/* KEYBOARD HERO NAVIGATION */

heroSlider.addEventListener("keydown", event => {

    if (event.key === "ArrowRight") {

        nextHeroSlide();
        startHeroSlideshow();

    }

    if (event.key === "ArrowLeft") {

        previousHeroSlide();
        startHeroSlideshow();

    }

});


document.addEventListener("visibilitychange", () => {

    if (document.hidden) {

        clearInterval(heroSlideTimer);

    } else {

        startHeroSlideshow();

    }

});


showHeroSlide(0);
startHeroSlideshow();


/* =====================================================
   CLIENT EXPERIENCE / CUSTOMER FEEDBACK
   NEW FUNCTIONALITY
   ===================================================== */

const feedbackForm =
    document.getElementById("feedbackForm");

const reviewName =
    document.getElementById("reviewName");

const reviewEvent =
    document.getElementById("reviewEvent");

const reviewMessage =
    document.getElementById("reviewMessage");

const reviewRating =
    document.getElementById("reviewRating");

const ratingStars =
    document.querySelectorAll(".rating-star");

const ratingError =
    document.getElementById("ratingError");

const reviewsList =
    document.getElementById("reviewsList");

const reviewsEmpty =
    document.getElementById("reviewsEmpty");

const feedbackSuccess =
    document.getElementById("feedbackSuccess");


const REVIEW_STORAGE_KEY =
    "joellesCateringCustomerReviews";


let selectedRating = 0;


/* LOAD REVIEWS SAFELY */

function getSavedReviews() {

    try {

        const storedReviews =
            localStorage.getItem(REVIEW_STORAGE_KEY);

        if (!storedReviews) {
            return [];
        }

        const parsedReviews =
            JSON.parse(storedReviews);

        if (!Array.isArray(parsedReviews)) {
            return [];
        }

        return parsedReviews;

    } catch (error) {

        return [];

    }

}


/* SAVE REVIEWS */

function saveReviews(reviews) {

    try {

        localStorage.setItem(
            REVIEW_STORAGE_KEY,
            JSON.stringify(reviews)
        );

    } catch (error) {

        console.warn(
            "Reviews could not be saved in this browser."
        );

    }

}


/* STAR VISUALS */

function paintStars(rating, preview = false) {

    ratingStars.forEach(star => {

        const starValue =
            Number(star.dataset.rating);

        const icon =
            star.querySelector("i");


        star.classList.remove(
            "selected",
            "preview"
        );


        if (starValue <= rating) {

            star.classList.add(
                preview ? "preview" : "selected"
            );

            icon.classList.remove("fa-regular");
            icon.classList.add("fa-solid");

        } else {

            icon.classList.remove("fa-solid");
            icon.classList.add("fa-regular");

        }

    });

}


/* SELECT STAR */

ratingStars.forEach(star => {

    star.addEventListener("click", () => {

        selectedRating =
            Number(star.dataset.rating);

        reviewRating.value =
            selectedRating;

        ratingError.textContent = "";

        paintStars(selectedRating);


        ratingStars.forEach(item => {

            item.setAttribute(
                "aria-checked",
                item === star ? "true" : "false"
            );

        });

    });


    star.addEventListener("mouseenter", () => {

        const hoverRating =
            Number(star.dataset.rating);

        paintStars(
            hoverRating,
            true
        );

    });


    star.addEventListener("focus", () => {

        const focusRating =
            Number(star.dataset.rating);

        paintStars(
            focusRating,
            true
        );

    });

});


const starRatingContainer =
    document.getElementById("starRating");


starRatingContainer.addEventListener(
    "mouseleave",
    () => {

        paintStars(selectedRating);

    }
);


starRatingContainer.addEventListener(
    "focusout",
    event => {

        if (
            !starRatingContainer.contains(
                event.relatedTarget
            )
        ) {

            paintStars(selectedRating);

        }

    }
);


/* CREATE REVIEW CARD SAFELY */

function createReviewCard(review) {

    const article =
        document.createElement("article");

    article.className =
        "review-card";


    const top =
        document.createElement("div");

    top.className =
        "review-card-top";


    const person =
        document.createElement("div");

    person.className =
        "review-person";


    const avatar =
        document.createElement("div");

    avatar.className =
        "review-avatar";

    avatar.textContent =
        review.name.charAt(0).toUpperCase();


    const personInfo =
        document.createElement("div");


    const name =
        document.createElement("strong");

    name.textContent =
        review.name;


    personInfo.appendChild(name);


    if (review.eventType) {

        const event =
            document.createElement("span");

        event.className =
            "review-event";

        event.textContent =
            review.eventType;

        personInfo.appendChild(event);

    }


    person.appendChild(avatar);
    person.appendChild(personInfo);


    const stars =
        document.createElement("div");

    stars.className =
        "review-stars";

    stars.setAttribute(
        "aria-label",
        `${review.rating} out of 5 stars`
    );


    for (let i = 1; i <= 5; i++) {

        const star =
            document.createElement("i");

        if (i <= review.rating) {

            star.className =
                "fa-solid fa-star";

        } else {

            star.className =
                "fa-regular fa-star";

        }

        stars.appendChild(star);

    }


    top.appendChild(person);
    top.appendChild(stars);


    const message =
        document.createElement("p");

    message.className =
        "review-text";

    message.textContent =
        review.message;


    const date =
        document.createElement("span");

    date.className =
        "review-date";

    date.textContent =
        review.date;


    article.appendChild(top);
    article.appendChild(message);
    article.appendChild(date);


    return article;

}


/* DISPLAY REVIEWS */

function displayReviews() {

    const reviews =
        getSavedReviews();


    reviewsList
        .querySelectorAll(".review-card")
        .forEach(card => card.remove());


    if (reviews.length === 0) {

        reviewsEmpty.style.display =
            "flex";

        return;

    }


    reviewsEmpty.style.display =
        "none";


    reviews
        .slice()
        .reverse()
        .forEach(review => {

            reviewsList.appendChild(
                createReviewCard(review)
            );

        });

}


/* SUBMIT CUSTOMER REVIEW */

feedbackForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();


        const customerName =
            reviewName.value.trim();

        const customerMessage =
            reviewMessage.value.trim();

        const customerEvent =
            reviewEvent.value;


        if (!customerName) {

            reviewName.focus();
            return;

        }


        if (selectedRating < 1) {

            ratingError.textContent =
                "Please choose a star rating.";

            ratingStars[0].focus();

            return;

        }


        if (!customerMessage) {

            reviewMessage.focus();
            return;

        }


        const currentDate =
            new Date();


        const formattedReviewDate =
            currentDate.toLocaleDateString(
                "en-KE",
                {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                }
            );


        const newReview = {

            name: customerName,

            eventType: customerEvent,

            rating: selectedRating,

            message: customerMessage,

            date: formattedReviewDate

        };


        const reviews =
            getSavedReviews();


        reviews.push(newReview);


        saveReviews(reviews);


        displayReviews();


        feedbackForm.reset();


        selectedRating = 0;

        reviewRating.value = "";

        ratingError.textContent = "";

        paintStars(0);


        ratingStars.forEach(star => {

            star.setAttribute(
                "aria-checked",
                "false"
            );

        });


        feedbackSuccess.classList.add(
            "show"
        );


        setTimeout(() => {

            feedbackSuccess.classList.remove(
                "show"
            );

        }, 6000);

    }
);


/* SHOW EXISTING LOCAL REVIEWS ON LOAD */

displayReviews();