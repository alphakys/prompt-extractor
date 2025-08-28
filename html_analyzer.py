
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
from playwright.async_api import async_playwright
from typing import Union

def run_usual_login(pw: Union[async_playwright, sync_playwright]):

    browser = pw.chromium.launch(headless=False)
    # default_context = browser.contexts[0]
    # default_context.storage_state(path="./playwright/.auth/state.json")
    page = browser.new_page()
    page.goto("https://www.google.com")

    # Gemini Sign in button
    page.get_by_label('로그인').click()
    # Gemini Sign in email input
    page.get_by_label("이메일 또는 휴대전화").fill("gys1120")
    page.get_by_text("다음").click()
    # Gemini Sign in password input
    page.get_by_label("비밀번호 입력").fill("fashom-tahCar-9titqi")

    page.get_by_text("다음").click()

    new_context = browser.new_context(storage_state="/home/alpha/workspace/gemini_prompt_extractor/playwright/.auth/state.json")
    new_page = new_context.new_page()

    new_page.goto("https://gemini.google.com/app/1125829d2526c163")


    new_page.wait_for_timeout(100000)



def run_oauth_login(pw: Union[async_playwright, sync_playwright]):
    browser = pw.chromium.connect_over_cdp("http://localhost:9222")
    default_context = browser.contexts[0]
    page = default_context.pages[0]
    page.goto("https://gemini.google.com/app")

    # Gemini Sign in button
    page.get_by_label('로그인').click()
    # Gemini Sign in email input
    page.get_by_label("이메일 또는 휴대전화").fill("gys1120")
    page.get_by_text("다음").click()
    # Gemini Sign in password input
    page.get_by_label("비밀번호 입력").fill("fashom-tahCar-9titqi")
    page.wait_for_timeout(1000)
    page.get_by_text("다음").click()




# [bash: google-chrome --remote-debugging-port=9222 --user-data-dir=~/chrome-dev-session]
# --user-data-dir=[some/path]: This is highly recommended.
# It launches a fresh, temporary Chrome profile in the specified directory.
# This prevents the command from interfering with your main Chrome profile (your open tabs, logins, etc.)
# and ensures a clean testing environment.

if __name__ == '__main__':

    with sync_playwright() as spw:
        # run_oauth_login(spw)
        browser = spw.chromium.connect_over_cdp("http://localhost:9222")
        if browser.is_connected():
            default_context = browser.contexts[0]
            page = default_context.pages[0]

            html = page.inner_html("body")

            soup = BeautifulSoup(html, 'html.parser')

            print(soup.get_text())
