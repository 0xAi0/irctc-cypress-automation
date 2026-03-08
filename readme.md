![Please Favourite This Project Before Reading (1)](https://github.com/shivamguys/irctc-cypress-automation/assets/25263989/1fe791dc-d320-42dd-99c9-d33fd034525b)

# IRCTC Tatkal Playwright Automation !

### Now book your tatkal tickets under 1 min at ease by bypassing captcha and filling multiple passenger details at once. Let the script book it for you.

🙏😍👏🙏😍🙏👏🙏😍🙏👏🙏😍🙏😍🙏👏🔥👍🔥👍🔥👍🔥
## 🎉🎉🎉🎉🎉🎉 Thanks for the appreciation guys, much appreciated. 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉

![image](https://github.com/user-attachments/assets/8a1c8320-7389-4d91-bc8d-6886e6487017)
![Tatkal_Appreciation](https://github.com/user-attachments/assets/8d167d29-8b24-461e-9ff3-a8b7df5a2883)


> [!NOTE] 
> ```
> This Playwright script for automating IRCTC ticket booking
> is created strictly for educational purposes. The code and its
> usage are intended to showcase Playwright automation capabilities and
> best practices. Any attempt to use this script for unauthorized
> access or activities that violate IRCTC terms of service or legal
> regulations is strictly prohibited. The author(s) and associated
> entities are not responsible for any misuse or legal consequences 
> resulting from the use of this script for any unauthorized 
> activities.
> ```

[![IRCTC Automation](https://github.com/shivamguys/irctc-cypress-automation/actions/workflows/irctc.yml/badge.svg)](https://github.com/shivamguys/irctc-cypress-automation/actions/workflows/irctc.yml)

<!-- [![IRCTC Automation](https://img.shields.io/endpoint?url=https://cloud.cypress.io/badge/simple/7afdkj/main&style=for-the-badge&logo=cypress)](https://cloud.cypress.io/projects/7afdkj/runs)

[![IRCTC Automation](https://img.shields.io/endpoint?url=https://cloud.cypress.io/badge/detailed/7afdkj/main&style=for-the-badge&logo=cypress)](https://cloud.cypress.io/projects/7afdkj/runs) -->


### Watch the simple recording here....
####  [Watch the video here](https://i.imgur.com/3U8yKmb.mp4)

[![](https://imgur.com/0xFTYhk.png)](https://i.imgur.com/3U8yKmb.mp4)




## Features

-  ✓ Can book **Tatkal**, **Premium Tatkal** and **Normal Tickets** as well.
-  ✓ Can book tickets for you if you open even **2-3 minutes** before tatkal time.
-  ✓ Signing in with your **username** and **password**.
-  ✓ **Auto Upgradation Enabled**.
-  ✓ Filling Captchas and retrying untill success.
-  ✓ Support for **Food Choices**, **Seats Preferences**.
-  ✓ Will Book only if confirm berths are alloted.
-  ✓ **Multiple passengers** supported. 
-  ✓ Pre filling all your information.
-  ✓ **Payment Gateway Automation** (Paying With **UPI ID** OR **QR Code**).



## How to Make this work for you?

- Things you need in your system **NodeJS**, **Python**.
- Make relevant changes in file located at **cypress/fixtures/passenger_data.json**
> [!TIP]
> Filling Your **UPI ID** Will Initiate A Payment Request Directly.
> But it's a bit slow generally would take 2 or 3 sec to arrive request on your smartphone.
> If Your are not using this then you can scan and pay directly which would be much faster.



> [!NOTE] 
> ```
> At a time either Tatkal Or Premium Tatkal can be -> true <- not both.
> ```
```
{
  "TRAIN_NO": "12318",
  "TRAIN_COACH": "3A",
  "TRAVEL_DATE": "12/09/2023",
  "SOURCE_STATION": "UMB",
  "BOARDING_STATION": null, <-- Change to full station name if required, else leave null
  "DESTINATION_STATION": "BSB",
  "TATKAL": true,
  "PREMIUM_TATKAL": false,
  "UPI_ID_CONFIG": "",
  "PASSENGER_DETAILS": [
    {
      "NAME": "SHIVAM PANDEY",
      "AGE": 25,
      "GENDER": "Male",
      "SEAT": "Side Upper",
      "FOOD" "No Food"
    }
  ],

}
```

- Below are the relevant values you can use for **TRAIN_COACH**, **GENDER** , **SEAT**

***
```
"__valid_coaches__": "SL | 2A | 3A | 3E | 1A | CC | EC | 2S", <---------- Please Use Only from these values.
"__valid_seats__": "Lower | Middle | Upper | Side Lower | Side Upper | Window Side | No Preference",   <---------- Please Use Only from these values.
"__valid_genders__": "Male | Female | Transgender", <---------- Please Use Only from these values.
"__valid_food_choices__": "Veg | Non Veg | No Food" <---------- Please Use Only from these values.

```
***


- You can add multiple passenger array of objects in `PASSENGER_DETAILS` as an example below
```
{
  "TRAIN_NO": "12318",
  "TRAIN_COACH": "3A",
  "TRAVEL_DATE": "12/09/2023",
  "SOURCE_STATION": "UMB",
  "BOARDING_STATION": null, <-- Change to full station name if required, else leave null
  "DESTINATION_STATION": "BSB",
  "TATKAL": true,
   "PREMIUM_TATKAL": false,
  "UPI_ID_CONFIG": "",
  "PASSENGER_DETAILS": [
    {
      "NAME": "SHIVAM PANDEY",
      "AGE": 26,
      "GENDER": "Male",
      "SEAT": "Side Upper",
      "FOOD" "No Food"
    },
    {
      "NAME": "Rachna Bhagat",
      "AGE": 26,
      "GENDER": "Female",
      "SEAT": "Side Lower",
      "FOOD" "No Food"
    },
    {
      "NAME": "Passenger 3 Name",
      "AGE": 26,
      "GENDER": "Female",
      "SEAT": "Side Lower",
      "FOOD" "No Food"
    }
  ],

}
```



- You can configure your IRCTC `USERNAME` , `password` in `cypress.env.json`

> [!TIP]
> If you wish to enter **CAPTCHA** manually, then change `MANUAL_CAPTCHA` to `true` in `cypress.env.json`

```
{
    "USERNAME": "yourusername",
    "PASSWORD": "yourpassword",
    "MANUAL_CAPTCHA": false
}
```
# Running This On Github System (No Installation Required Easy 5 Minute Steps)... ?
Follow The Guide -> https://github.com/shivamguys/irctc-cypress-automation/discussions/38


# Running This On Your System... ?
## Running this whole bunch.. ?


## Installation Guide
- Clone the code ```git clone https://github.com/shivamguys/irctc-cypress-automation.git``` or download the code zip files.
- Make sure you have **Nodejs** and **npm** installed in your system you can visit **NodeJs** official website you will have full instruction guide present over there to install in your system.

### Sample Nodejs and npm installation in Linux

```
# installs NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# download and install Node.js
nvm install 21
# verifies the right Node.js version is in the environment
node -v # should print `v21.7.1`
# verifies the right NPM version is in the environment
npm -v # should print `10.5.0`

```

### After NodeJs and Npm Installation, its time for you to install python and pip on your system.
### After Python Installation Follow Below Steps.......
##### In Case You Want To Install Pip here's the command to install in Linux
```sudo apt-get install python3-pip -y```


#### After Pip Installation you can install all requirements by pasting below command.
```
pip install -r irctc-captcha-solver/requirements.txt # <---- Make Sure You Run This Command From Code Folder. 
```

#### Check If Everything Works Fine.... 
This Would Print **No base-64 String provided** Which Means You Have Followed Correctly at this point.
```
python irctc-captcha-solver/app-server.py --host 0.0.0.0 --port 5001
```
Then run the curl to see if the captcha server is responding fine.
```
$ curl -X POST "http://localhost:5001/extract-text"      
-H "Content-Type: application/json"      
-d '{
     "image": ""
    }'
```
You should get below output.
```
{"error":"No base64 image string provided"}
```


### Last Step That's It...........

```
npm install # <---- Make Sure You Run This Command From Code Folder. 
npm run start-booking <---------- Starts captcha server, then executes Playwright booking flow 
```



## Playwright Migration Notes

- Cypress-based runtime commands have been migrated to Playwright test runner under `playwright/tests/irctc.spec.js`.
- Shared booking input data still comes from `cypress/fixtures/passenger_data.json` to avoid breaking existing data setup.
- Use `npm run test:install` once to install Chromium for Playwright.
- Main booking run command is now `npm run start-irctc-booking`.

## Playwright Python + Brave (Remote Debugging) Mode

Yes — this can be beneficial for real booking runs because it allows you to attach to a persistent Brave profile/session (cookies, login continuity, reduced anti-bot friction).

### Is everything automatic when running `playwright_python/irctc_booking.py`?

**Mostly automatic, with a few prerequisites:**
- The script automates login form filling, captcha solving (OCR/manual), source/destination/date/quota input, and train card selection.
- You still need to start Brave with remote debugging and provide valid `USERNAME`/`PASSWORD` env vars.
- Full payment finalization may still require user confirmation depending on gateway challenges/UPI app approval.

### 1) Install Python dependencies

```bash
pip install -r playwright_python/requirements.txt
python -m playwright install chromium
```

### 2) Start Brave with remote debugging enabled

Linux example:

```bash
brave-browser --remote-debugging-port=9222 --user-data-dir=/tmp/irctc-brave-profile
```

### 3) Run the Python Playwright automation (attach mode)

```bash
export USERNAME="your_irctc_username"
export PASSWORD="your_irctc_password"
python playwright_python/irctc_booking.py --cdp-url http://127.0.0.1:9222
```

Use manual captcha mode if needed:

```bash
python playwright_python/irctc_booking.py --manual-captcha
```


### Python-only mode (no npm scripts)

You can run the flow fully from Python by letting the script start the OCR server automatically:

```bash
# terminal 1: start Brave once with CDP
brave-browser --remote-debugging-port=9222 --user-data-dir=/tmp/irctc-brave-profile

# terminal 2: run python automation + auto OCR server startup
export USERNAME="your_irctc_username"
export PASSWORD="your_irctc_password"
python playwright_python/irctc_booking.py --cdp-url http://127.0.0.1:9222 --auto-start-ocr
```

Optional manual captcha in Python-only mode:

```bash
python playwright_python/irctc_booking.py --cdp-url http://127.0.0.1:9222 --auto-start-ocr --manual-captcha
```
