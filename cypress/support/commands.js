import {
    formatDate,
    hasTatkalAlreadyOpened,
    tatkalOpenTimeForToday,
} from "../utils";

const MANUAL_CAPTCHA = Cypress.env("MANUAL_CAPTCHA");
const CAPTCHA_SOLVER_URL = "http://localhost:5000/extract-text";
const MAX_CAPTCHA_ATTEMPTS = 120;

Cypress.on("uncaught:exception", (err, runnable) => {
    // returning false here prevents Cypress from failing the test
    return false;
});

Cypress.Commands.add("submitCaptcha", () => {
    let LOGGED_IN = false;
    performLogin(LOGGED_IN);
});

Cypress.Commands.add("solveCaptcha", () => {
    solveCaptcha();
});

Cypress.Commands.add(
    "bookUntilTatkalGetsOpen",
    (div, TRAIN_COACH, TRAVEL_DATE, TRAIN_NO, TATKAL) => {
        BOOK_UNTIL_TATKAL_OPENS(
            div,
            TRAIN_COACH,
            TRAVEL_DATE,
            TRAIN_NO,
            TATKAL
        );
    }
);

function performLogin(LOGGED_IN) {
    if (!LOGGED_IN) {
        cy.wait(500);

        cy.get("body")
        .should("be.visible")
        .then((el) => {
            if (el[0].innerText.includes("Logout")) {
                cy.task("log", "We have logged in successfully at this stage");
            } else if (
                el[0].innerText.includes("FORGOT ACCOUNT DETAILS") &&
                !el[0].innerText.includes("Please Wait...")
            ) {
                if (MANUAL_CAPTCHA) {
                    cy.get("#captcha").focus();
                    // Wait for user to manually enter captcha and login
                    cy.get(".search_btn.loginText")
                    .should("include.text", "Logout")
                    .then(() => {
                        performLogin(true);
                    });
                } else {
                    // Use the local server to solve the captcha
                    cy.get(".captcha-img")
                    .invoke("attr", "src")
                    .then(requestCaptchaText)
                    .then((extractedText) => {
                        cy.get("#captcha")
                        .clear()
                        .type(extractedText)
                        .type("{enter}");

                        getBodyText().then((bodyText) => {
                            if (bodyText.includes("Logout")) {
                                performLogin(true);
                                return;
                            }

                            performLogin(false);
                        });
                    });
                }
            } else {
                performLogin(false);
            }
        });
    }
}

// function to solveCaptcha after logging in

function solveCaptcha(attemptsLeft = MAX_CAPTCHA_ATTEMPTS) {
    cy.wrap(attemptsLeft, { timeout: 10000 }).should("be.gt", 0);

    cy.wait(500);
    getBodyText().then((bodyText) => {
        if (
            bodyText.includes(
                "Unable to process current transaction"
            ) &&
            bodyText.includes("Payment Mode")
        ) {
            cy.get(".train_Search").click();
            cy.wait(1000);
        }

        if (bodyText.includes("Sorry!!! Please Try again!!")) {
            throw new Error("Sorry!!! Please Try again!! <<< Thrown By IRCTC");
        }

        if (bodyText.includes("Payment Methods")) {
            return;
        }

        if (bodyText.includes("No seats available")) {
            cy.fail("Further execution stopped because there are no more tickets.");
        }

        if (
            bodyText.includes("Your ticket will be sent to") &&
            !bodyText.includes("Please Wait...") &&
            bodyText.includes("Enter Captcha")
        ) {
            if (MANUAL_CAPTCHA) {
                cy.get("#captcha").focus();
                getBodyText().then((latestBodyText) => {
                    if (latestBodyText.includes("Payment Methods")) {
                        cy.task("log", "Bypassed Captcha");
                    }
                });
            } else {
                cy.get(".captcha-img")
                .invoke("attr", "src")
                .then(requestCaptchaText)
                .then((extractedText) => {
                    cy.get("#captcha")
                    .clear()
                    .type(extractedText)
                    .type("{enter}");

                    getBodyText().then((latestBodyText) => {
                        if (latestBodyText.includes("Payment Methods")) {
                            cy.task("log", "Bypassed Captcha");
                        } else {
                            solveCaptcha(attemptsLeft - 1);
                        }
                    });
                });
            }
        } else if (bodyText.includes("Payment Methods")) {
            return;
        } else {
            solveCaptcha(attemptsLeft - 1);
        }
    });
}

function requestCaptchaText(imageSource) {
    return cy
        .request({
            method: "POST",
            url: CAPTCHA_SOLVER_URL,
            body: {
                image: imageSource,
            },
        })
        .its("body.extracted_text");
}

function getBodyText() {
    return cy.get("body").should("be.visible").invoke("text");
}

function BOOK_UNTIL_TATKAL_OPENS(
    div,
    TRAIN_COACH,
    TRAVEL_DATE,
    TRAIN_NO,
    TATKAL
) {
    cy.wait(1900);

    if (TATKAL && !hasTatkalAlreadyOpened(TRAIN_COACH)) {
        // wait for exact time
        // cy.task("log", "Waiting for the exact time of opening of TATKAL...");
        const exactTimeToOpen = tatkalOpenTimeForToday(TRAIN_COACH);
        cy.get("div.h_head1", { timeout: 300000 }).should(
            "include.text",
            exactTimeToOpen
        );
    }

    cy.get("body")
        .should("be.visible")
        .then((el) => {
            if (
                el[0].innerText.includes(
                    "Booking not yet started for the selected quota and class"
                ) &&
                !el[0].innerText.includes("Please Wait...")
            ) {
                cy.get(
                    ".level_1.hidden-xs > app-modify-search > .layer_2 > form.ng-untouched > .col-md-2 > .hidden-xs"
                ).click();

                // Another layer of protection from breaking up the code
                // we again check the body are we at any loading phase as in loading phase content becomes visible but div
                // not active to click it
                // body fetch block starts............
                cy.get("body")
                    .should("be.visible")
                    .then((el) => {
                        if (
                            el[0].innerText.includes(
                                "Booking not yet started for the selected quota and class"
                            ) &&
                            !el[0].innerText.includes("Please Wait...")
                        ) {
                            // iterating each block div of available trains starts here.....
                            cy.get(":nth-child(n) > .bull-back")
                                .should("be.visible")
                                .each((div, index) => {
                                    // confirming we click on same train no and seat class div
                                    if (
                                        div[0].innerText.includes(TRAIN_NO) &&
                                        div[0].innerText.includes(TRAIN_COACH)
                                    ) {
                                        console.log(index,"index no -<<<<<<<<<<<<<<<<<,")
                                        cy.wrap(div)
                                            .contains(TRAIN_COACH)
                                            .click();
                                        cy.get(
                                            `:nth-child(n) > .bull-back > app-train-avl-enq > :nth-child(1) > :nth-child(7) > :nth-child(1)`
                                        )
                                            .contains(formatDate(TRAVEL_DATE))
                                            .click();
                                        cy.get(
                                            `:nth-child(n) > .bull-back > app-train-avl-enq > [style="padding-top: 10px; padding-bottom: 20px;"]`
                                        )
                                        // :nth-child(8) > .form-group > app-train-avl-enq > [style="padding-top: 10px; padding-bottom: 20px;"] > [style="overflow-x: auto;"] > .pull-left > :nth-child(1) > .train_Search
                                            .contains("Book Now")
                                            .click();
                                        BOOK_UNTIL_TATKAL_OPENS(
                                            div,
                                            TRAIN_COACH,
                                            TRAVEL_DATE,
                                            TRAIN_NO,
                                            TATKAL
                                        );
                                    }
                                });
                            // iterating each block div of available trains ends here.....
                        } else {
                            BOOK_UNTIL_TATKAL_OPENS(
                                div,
                                TRAIN_COACH,
                                TRAVEL_DATE,
                                TRAIN_NO,
                                TATKAL
                            );
                        }
                    });
                // body fetch block ends............
            } else if (
                el[0].innerText.includes("Passenger Details") &&
                el[0].innerText.includes("Contact Details") &&
                !el[0].innerText.includes("Please Wait...")
            ) {
                cy.task(
                    "log",
                    "TATKAL BOOKING NOW OPEN....STARTING FURTHER PROCESS"
                );
            } else if (
                !el[0].innerText.includes("Passenger Details") &&
                !el[0].innerText.includes("Contact Details") &&
                !el[0].innerText.includes("Please Wait...")
            ) {
                cy.get("body").then((el) => {
                    // iterating each block div of available trains starts here.....
                    cy.get(":nth-child(n) > .bull-back").each((div, index) => {
                        // confirming we click on same train no and seat class div
                        if (
                            div[0].innerText.includes(TRAIN_NO) &&
                            div[0].innerText.includes(TRAIN_COACH)
                        ) {
                            cy.wrap(div).contains(TRAIN_COACH).click();
                            cy.get(
                                `:nth-child(n) > .bull-back > app-train-avl-enq > :nth-child(1) > :nth-child(7) > :nth-child(1)`
                            )
                                .contains(formatDate(TRAVEL_DATE))
                                .click();
                            cy.get(
                                `:nth-child(n) > .bull-back > app-train-avl-enq > [style="padding-top: 10px; padding-bottom: 20px;"]`
                            ).then((elements) => {
                                elements.each((i, el) => {
                                  // Check if the div contains the ₹ symbol
                                  if (el.innerText.includes("₹")) {
                                    console.log(`Found ₹ in Div ${i + 1}:`, el.innerText); // Log the matching div
                                    // Click the "Book Now" button inside this div
                                    cy.wrap(el).contains("Book Now").click();
                                  }
                                });
                            });
                            // .contains("Book Now")
                            // .should('be.visible') // Ensure it's visible
                            // .and('not.be.disabled') // Ensure it's not disabled
                            // .click();
                            BOOK_UNTIL_TATKAL_OPENS(
                                div,
                                TRAIN_COACH,
                                TRAVEL_DATE,
                                TRAIN_NO,
                                TATKAL
                            );
                        }
                    });
                    // iterating each block div of available trains ends here.....
                });
                // body fetch block ends............
            } else {
                BOOK_UNTIL_TATKAL_OPENS(
                    div,
                    TRAIN_COACH,
                    TRAVEL_DATE,
                    TRAIN_NO,
                    TATKAL
                );
            }
        });
}
