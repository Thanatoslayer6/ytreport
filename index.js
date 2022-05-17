const puppeteerExtra = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth');
require('dotenv-json-complex')();

const accounts = JSON.parse(process.env.accounts);
const channels = JSON.parse(process.env.channels);
const reason = JSON.parse(process.env.reason);

let login = async(username, password) => {
    puppeteerExtra.use(stealthPlugin()); 
    const browser = await puppeteerExtra.launch({ headless: false });
    const context = await browser.createIncognitoBrowserContext();
    // const page = (await context.pages())[0];
    const page = await context.newPage()
    await page.goto('https://accounts.google.com/signin/v2/identifier?service=youtube')
    await page.type('[type="email"]', username)
    await page.click('#identifierNext');
    await page.waitForTimeout(1500);
    await page.type('[type="password"]', password) 
    await page.click('#passwordNext');
    await page.waitForTimeout(1500);
    return {
        browser: browser,
        page: page,
        context: context
    }
}

// Main function
;(async() => {
    // First we login to our google account...
    let randomReason, handler;
    for (let i = 0; i < accounts.length; i++) {
        handler = await login(accounts[i].username, accounts[i].password);
        for (let k = 0; k < channels.length; k++) {
            randomReason = reason[Math.floor(Math.random()*reason.length)]; // Grab random message as reason for reporting
            await handler.page.waitForTimeout(12000); // Wait for 2FA/OTP
            await handler.page.goto(`${channels[k]}/about`);
            await handler.page.waitForSelector('#action-buttons > ytd-button-renderer a button', { visible: true }).then(() => { // Wait for report button to show up
                handler.page.click('#action-buttons > ytd-button-renderer a button')
                console.log('Report button clicked...')
            })
            await handler.page.waitForTimeout(1500);
            await handler.page.waitForSelector('ytd-menu-service-item-renderer.style-scope:nth-child(4)', { visible: true }).then(() => {
                handler.page.click('ytd-menu-service-item-renderer.style-scope:nth-child(4)')
                console.log('Report User!')
            })
            await handler.page.waitForTimeout(1500);
            await handler.page.waitForSelector('tp-yt-paper-radio-button.radio:nth-child(14) > div:nth-child(1)', { visible: true }).then(() => {
                handler.page.click('tp-yt-paper-radio-button.radio:nth-child(14) > div:nth-child(1)')
                console.log('Reporting user for spam and scams') // WIP
            })
            await handler.page.waitForTimeout(1500)
            await handler.page.click('#next-button') 
            await handler.page.waitForTimeout(1500)
            await handler.page.click('#next-button')
            await handler.page.waitForTimeout(1500)
            await handler.page.type('#textarea', randomReason);
            await handler.page.click('#next-button') // Submit report and hope for the best ;-;
            await handler.page.waitForTimeout(1500)
        }
        await handler.context.close();
        await handler.browser.close();
    }
})();
