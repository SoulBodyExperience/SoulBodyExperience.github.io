import CM from './CoreModel.js';
import DatabaseManager from './DatabaseManager.js';
import DB from './DatabaseManager.js';
import HM from './HtmlManager.js';

const buttonMenu = document.getElementById("buttonMenu");
const buttonPrevious = document.getElementById("previousPage");
const buttonNext = document.getElementById("nextPage");
const contentElement = document.getElementById("content");
const contentHeaderElement = document.getElementById("contentHeader");

DatabaseManager.LoadingTakesLonger = () => { contentElement.style.display = "block"; }
window.onload = init;

function ShowMenu() {
    document.getElementById("drawer").classList.toggle("open");
    document.addEventListener("click", CloseMenu);
}

function CloseMenu(event) {
    const drawer = document.getElementById("drawer");
    if ((event === null) || (!drawer.contains(event.target) && !document.getElementById('buttonMenu').contains(event.target))) {
        drawer.classList.remove("open");
        document.removeEventListener("click", CloseMenu)
    }
    if (event != null) event.stopPropagation();
}

async function init() {
    buttonMenu.disabled = true;
    let chapters = await DB.getChapters();
    if (chapters === null) {
        alert("Content could not be accessed. Please check network connection and reload page!");
        return;
    }
    chapters = chapters.slice().sort((a, b) => a.order - b.order);
    CM.Chapters = chapters.filter(chapter => !chapter.title.startsWith("/"));
    CM.CurrentChapterIndex = 0;
    const menuElement = document.getElementById("menu");
    menuElement.innerHTML = "";
    for (let i = 0; i < chapters.length; i++) { 
    //chapters.forEach(item => {
        let item = chapters[i];
        const listItem = document.createElement('li');
        listItem.id = "menu" + item.id;
        if (!item.title.startsWith("/")) {
            listItem.style.paddingLeft = "10px";
            listItem.onclick = function () {
                ShowSections(item.id);
            }
        }
        else {
            listItem.style.paddingTop = "10px";
        }
        let parts = item.title.split(';');
        if (parts[0].startsWith("/")) {
            listItem.textContent = parts[0].substring(1);
        }
        else {
            listItem.textContent = parts[0];
        }
        listItem.style.color = (parts.length > 1) ? parts[1] : "black";
        listItem.className = "ChapterMenuItem";
        if (i === 0 || i === chapters.length - 1) {
            listItem.style.paddingLeft = "0";
            listItem.style.paddingTop = "10px";
        }
        menuElement.appendChild(listItem);
    }

    let sections = await DB.getSections(CM.Chapters[CM.CurrentChapterIndex].id);
    CM.Sections = sections.slice().sort((a, b) => a.order - b.order);
    CM.CurrentSectionIndex = 0;
    let pages = await DB.getPages(CM.Sections[CM.CurrentSectionIndex].id);
    CM.Pages = pages.slice().sort((a, b) => a.order - b.order);
    CM.CurrentPageIndex = 0;
    let page = CM.Pages[CM.CurrentPageIndex];
    SetContentHtml(page);
    SetNextPreviousButtonState();
    contentElement.style.display = "block";
    buttonMenu.disabled = false;
}

async function ShowSections(chapterId) {
    document.querySelectorAll(".SectionMenuItem").forEach(item => item.remove());
    let sections = await DB.getSections(chapterId);
    sections = sections.slice().sort((a, b) => a.order - b.order);
    const menuElement = document.getElementById("menu" + chapterId);
    let color = menuElement.style.color;
    for (let i = sections.length - 1; i >= 0; i--) {
        const listItem = document.createElement('li');
        listItem.textContent = "- " + sections[i].title;
        listItem.style.paddingLeft = "20px";
        listItem.style.color = color;
        listItem.className = "SectionMenuItem";
        listItem.onclick = function () {
            ShowPage(sections[i]);
            document.getElementsByTagName("header")[0].style.backgroundColor = color;
            document.getElementById("title").textContent = menuElement.textContent.trim();
            CloseMenu(null);
        }
        menuElement.insertAdjacentElement('afterend', listItem);
    }
}

async function ShowPage(section) {
    document.querySelectorAll(".SectionMenuItem").forEach(item => item.remove());
    let sections = await DB.getSections(section.chapterId);
    CM.Sections = sections.slice().sort((a, b) => a.order - b.order);
    CM.CurrentChapterIndex = CM.Chapters.findIndex(chapter => chapter.id === section.chapterId);
    CM.CurrentSectionIndex = CM.Sections.findIndex(section => section.id === section.id);
    CM.CurrentPageIndex = 0;
    let pages = await DB.getPages(section.id);
    CM.Pages = pages.slice().sort((a, b) => a.order - b.order);
    let page = CM.Pages[CM.CurrentPageIndex];
    SetContentHtml(page);
    SetNextPreviousButtonState();
}

async function PreviousPage() {
    if (CM.CurrentPageIndex <= 0) {
        if (CM.CurrentSectionIndex <= 0) {
            if (CM.CurrentChapterIndex <= 0) return;
            CM.CurrentChapterIndex -= 1;
            let sections = await DB.getSections(CM.Chapters[CM.CurrentChapterIndex].id);
            CM.Sections = sections.slice().sort((a, b) => a.order - b.order);
            CM.CurrentSectionIndex = CM.Sections.length - 1;
        }
        else {
            CM.CurrentSectionIndex -= 1;
        }
        let pages = await DB.getPages(CM.Sections[CM.CurrentSectionIndex].id);
        CM.Pages = pages.slice().sort((a, b) => a.order - b.order);
        CM.CurrentPageIndex = CM.Pages.length - 1;
    }
    else CM.CurrentPageIndex -= 1;
    let page = CM.Pages[CM.CurrentPageIndex];
    SetContentHtml(page);
    SetNextPreviousButtonState();
}

async function NextPage() {
    if (CM.CurrentPageIndex >= CM.Pages.length - 1) {
        if (CM.CurrentSectionIndex >= CM.Sections.length - 1) {
            if (CM.CurrentChapterIndex >= CM.Chapters.length - 1) return;
            CM.CurrentChapterIndex += 1;
            let sections = await DB.getSections(CM.Chapters[CM.CurrentChapterIndex].id);
            CM.Sections = sections.slice().sort((a, b) => a.order - b.order);
            CM.CurrentSectionIndex = 0;
        }
        else {
            CM.CurrentSectionIndex += 1;
        }
        CM.CurrentPageIndex = 0;
        let pages = await DB.getPages(CM.Sections[CM.CurrentSectionIndex].id);
        CM.Pages = pages.slice().sort((a, b) => a.order - b.order);
    }
    else CM.CurrentPageIndex += 1;
    let page = CM.Pages[CM.CurrentPageIndex];
    SetContentHtml(page);
    SetNextPreviousButtonState();
}

function SetContentHtml(page) {
    contentHeaderElement.innerHTML = CM.Sections[CM.CurrentSectionIndex].title + " (" + (CM.CurrentPageIndex + 1) + ")";
    contentElement.innerHTML = HM.ReplaceMediaTags(page, DB.BACKEND_URL);
}

function SetNextPreviousButtonState() {
    if (CM.CurrentChapterIndex === 0 && CM.CurrentSectionIndex === 0 && CM.CurrentPageIndex === 0) {
        buttonPrevious.disabled = true;
    }
    else {
        buttonPrevious.disabled = false;
    }
    if (CM.CurrentChapterIndex === CM.Chapters.length - 1 && CM.CurrentSectionIndex === CM.Sections.length - 1 && CM.CurrentPageIndex === CM.Pages.length -1) {
        buttonNext.disabled = true;
    }
    else {
        buttonNext.disabled = false;
    }
}

buttonMenu.addEventListener("click", ShowMenu)
buttonPrevious.addEventListener("click", PreviousPage)
buttonNext.addEventListener("click", NextPage)