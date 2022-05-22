const puppeteerExtra = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth');
const { prompt } = require('enquirer');
require('dotenv-json-complex')();

const accounts = JSON.parse(process.env.accounts);
const channels = JSON.parse(process.env.channels);
const reason = JSON.parse(process.env.reason);
const timeout = process.env.timeout || 1500; // Check env file for timeout
console.log(`Timeout is set as: ${timeout}`)

let login = async(username, password, otp) => {
    puppeteerExtra.use(stealthPlugin()); 
    const browser = await puppeteerExtra.launch({ headless: false, args: [ "--incognito" ] });
    const page = (await browser.pages())[0];
    // const context = await browser.createIncognitoBrowserContext();
    // const page = (await context.pages())[0];
    // const page = await context.newPage()
    await page.goto('https://accounts.google.com/signin/v2/identifier?service=youtube')
    await page.type('[type="email"]', username)
    await page.click('#identifierNext');
    await page.waitForTimeout(timeout);
    await page.type('[type="password"]', password) 
    await page.click('#passwordNext');
    await page.waitForTimeout(timeout);
    if (otp == true) {
        await prompt({
            type: 'input',
            name: 'code',
            message: `Please enter the OTP Code for (${username}):`
        }).then(async response => {
            // After user enters the OTP Code
            await page.type('[type="tel"]', response.code)
            await page.click('#totpNext')
            await page.waitForNavigation({ timeout: 5000 });
        }).catch(async err => {
            // EXIT
            await browser.close();
            throw Error(`Failed to log in, wrong 2FA code or maybe network issues (${username})`)
        })
    }
    console.log(`Successfully logged in as ${username}`)
    return {
        browser: browser,
        page: page,
    }
}

// Main function
;(async() => {
    // First we login to our google account...
    let randomReason, handler, channelName, issue = null;
    for (let i = 0; i < accounts.length; i++) {
        handler = await login(accounts[i].username, accounts[i].password, accounts[i].otp);
        for (let k = 0; k < channels.length; k++) {
            randomReason = reason[Math.floor(Math.random()*reason.length)]; // Grab random message as reason for reporting
            await handler.page.goto(`${channels[k].url}/about`);
            await handler.page.waitForSelector('#action-buttons > ytd-button-renderer a button', { visible: true }).then(() => { // Wait for report button to show up
                handler.page.click('#action-buttons > ytd-button-renderer a button')
            })
            await handler.page.waitForTimeout(timeout);
            await handler.page.waitForSelector('ytd-menu-service-item-renderer.style-scope:nth-child(4)', { visible: true }).then(async () => {
                handler.page.click('ytd-menu-service-item-renderer.style-scope:nth-child(4)')
                channelName = await handler.page.$eval('ytd-channel-name.ytd-c4-tabbed-header-renderer > div', el => el.innerText);
                console.log(`Reporting user: ${channelName}`)
            })
            await handler.page.waitForTimeout(timeout);
            // if (issue == null) { // If first try, query all options for reporting and store them in a variable for later use
            issue = await handler.page.$$('#radioContainer')
            // } 
            // Assuming that the issue variable already contains the possible options for reporting... "Spams and scams", "Privacy", etc...
            if (channels[k].num == undefined || channels[k].num >= 8 || channels[k].num <= 0) { // If user tries to exceed the possible options; goes higher than 7 or lower than 1; undefined
                await issue[6].click() 
            } else {
                await issue[channels[k].num - 1].click() // Default is "Spams and Scams", now we just click!
            }
            
            // console.log(issue)
            // await handler.page.click(issue[6]);
            // await handler.page.waitForSelector('tp-yt-paper-radio-button.radio:nth-child(14) > div:nth-child(1)', { visible: true }).then(() => {
            //     handler.page.click('tp-yt-paper-radio-button.radio:nth-child(14) > div:nth-child(1)')
            //     console.log('Reporting user for spam and scams') // WIP
            // })
            await handler.page.waitForTimeout(timeout)
            await handler.page.click('#next-button') 
            await handler.page.waitForTimeout(timeout)
            await handler.page.click('#next-button')
            await handler.page.waitForTimeout(timeout)
            await handler.page.type('#textarea', randomReason);
            await handler.page.click('#next-button') // Submit report and hope for the best ;-;
            await handler.page.waitForTimeout(timeout)
        }
        // EXIT
        await handler.browser.close();
    }
})();
