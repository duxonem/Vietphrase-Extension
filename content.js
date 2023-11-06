let Options;

function $(e) { return e ? document.getElementById(e) || document.querySelector(e) : false };

chrome.runtime.onMessage.addListener((mess, sender, sendResponse) => {
    let payload = '';
    switch (mess.action) {
        case "sendName":
        case "sendVP": payload = getTextFromSelection(mess.payload); break;
    }
    sendResponse({ 'action': mess.action, 'payload': payload });
    return true;
    // return Promise.resolve({ 'action': mess.action, 'payload': payload });
})

function getTextFromSelection(text) { //chi xet trong 1 node
    let selection = window.getSelection();
    let result = { "Viet": '', "Trung": '', mySelection: '', selection: '', start: -1, end: -1 };
    if (/^[\p{sc=Han}]+$/u.test(selection.toString())) {  ///^[\p{sc=Han}]+$/u.test(selection.toString())
        result.start = 0;
        result.selection = selection.toString();
        result.end = result.selection.length;
        result.Viet = result.selection;
        result.Trung = result.selection;
        result.mySelection = result.selection;
        return result;
    }
    if (!selection.anchorNode.origin) return false; //Khong co tieng trung, chua tung dich ||selection.anchorNode.isTranslated
    result.Viet = selection.anchorNode.textContent;
    result.Trung = selection.anchorNode.origin;

    if (selection.anchorNode != selection.focusNode) return false;
    if (result.Viet.indexOf('<') > -1 && result.Viet.indexOf('>') > -1) return false;

    result.start = selection.anchorOffset;
    result.end = selection.focusOffset;
    if (result.start > result.end) [result.start, result.end] = [result.end, result.start];

    for (let i = result.start; i >= 0; i--)
        if (/[\s\'\".?!,。！？“”，：]/.test(result.Viet.charAt(i))) { result.start = i + 1; break }
    for (let i = result.end - 1; i < result.Viet.length; i++)
        if (/[\s\'\".?!,。！？“”，：]/.test(result.Viet.charAt(i))) { result.end = i; break }
    if (result.start > -1 && result.end > -1) result.mySelection = result.Viet.slice(result.start, result.end);
    result.selection = selection.toString();
    if (result.Viet.match(/^\s+/)) {
        let a = result.Viet.match(/^\s+/)[0].length
        result.start = result.start - a > -1 ? (result.start - a) : 0;
        result.end -= a;
    }
    if (result.start > result.end) [result.start, result.end] = [result.end, result.start];
    result.Viet = result.Viet.trim();
    result.Trung = result.Trung.trim();
    return result;
}

function isOverflowed(el) {
    const s = getComputedStyle(el);
    if (s.overflow == 'visible') return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
    else return false;
}

function reStyle(node) {
    const blockEl = 'div,li'; //cang nhieu the thoi gian cang lau, co the len toi 10x thoi gian translate, de div la phu hop
    if (node == document) node = document.body;
    node.querySelectorAll(blockEl).forEach(e => { if (isOverflowed(e)) e.style.overflow = 'hidden'; })
}

let nodeArr = [];
let firstTrans = true;
async function translateNode(rootNode) {
    let nodesText = '';
    const limiter = '\uf0f3'.repeat(1);
    function nodeToArr(node) {
        if (!node) return;
        if (node.tagName == 'SCRIPT') return;
        if (node.nodeType == 3 && !node.isTranslated) {
            node.origin = node.textContent;
            nodeArr.push(node);
            nodesText += node.textContent + limiter;
            node.isTranslated = true;
        }
        node.childNodes?.forEach((childNode) => nodeToArr(childNode))
    }
    nodeToArr(rootNode);
    if (Options.optionThayfont && firstTrans) {
        firstTrans = false;
        const font = Options.optionFont.split(/[;,]/).filter(e => e != '').join() + ', Arial !important';
        const style = document.createElement('style');
        style.appendChild(document.createTextNode(`body {font-family: ${font}; word-break:break-word;text-overflow:ellipsis;}`));
        document.head.appendChild(style);
    }

    chrome.runtime.sendMessage({ 'action': 'translate', 'payload': nodesText }, (mess) => {
        let textArr = mess.payload.split(limiter);
        textArr.forEach((text, index) => {
            const marks = ['.', '?', '!', '\r', '<br>', '。', '！', '？', '“', '”', ':', '：'];
            const vietT = 'aàảãáạăằẳẵắặâầẩẫấậbcdđeèẻẽéẹêềểễếệfghiìỉĩíịjklmnoòỏõóọôồổỗốộơờởỡớợpqrstuùủũúụưừửữứựvwxyỳỷỹýỵzAÀẢÃÁẠĂẰẲẴẮẶÂẦẨẪẤẬBCDĐEÈẺẼÉẸÊỀỂỄẾỆFGHIÌỈĨÍỊJKLMNOÒỎÕÓỌÔỒỔỖỐỘƠỜỞỠỚỢPQRSTUÙỦŨÚỤƯỪỬỮỨỰVWXYỲỶỸÝỴZ';
            const vietH = 'AÀẢÃÁẠĂẰẲẴẮẶÂẦẨẪẤẬBCDĐEÈẺẼÉẸÊỀỂỄẾỆFGHIÌỈĨÍỊJKLMNOÒỎÕÓỌÔỒỔỖỐỘƠỜỞỠỚỢPQRSTUÙỦŨÚỤƯỪỬỮỨỰVWXYỲỶỸÝỴZAÀẢÃÁẠĂẰẲẴẮẶÂẦẨẪẤẬBCDĐEÈẺẼÉẸÊỀỂỄẾỆFGHIÌỈĨÍỊJKLMNOÒỎÕÓỌÔỒỔỖỐỘƠỜỞỠỚỢPQRSTUÙỦŨÚỤƯỪỬỮỨỰVWXYỲỶỸÝỴZ';
            let capOn = true;
            if (nodeArr[index]) {
                if (nodeArr[index].textContent.length > 2) {  //dieu chinh do dai chuoi de viet Hoa. Đang lỗi vài chỗ viết hoa 2,3 chữ
                    //text = text.slice(0, 1) + vietH.charAt(vietT.indexOf(text.charAt(0))) + text.slice(1);
                    for (let i = 0; i < text.length; i++) {
                        let v = vietT.indexOf(text.charAt(i))
                        if (capOn && v > -1) {  //dang sai o day
                            text = text.slice(0, i) + vietH.charAt(v) + text.slice(i + 1);
                            capOn = false;
                        }
                        if (marks.indexOf(text.charAt(i)) > -1) capOn = true;
                    }
                }
                nodeArr[index].textContent = text;
            }
        });
        reStyle(rootNode);  ///reStyle ton nhieu thoi gian nhat, gap 10x thoi gian translat
    })
}

function loadOptions(fn) {
    return chrome.runtime.sendMessage({ 'action': 'loadOptions', 'payload': '' }).then(fn);
}

let lang = '', percent = '';
if (document.getElementsByTagName('html')[0].getAttribute('lang')?.includes('zh')) lang = 'zh';
let charset = document.querySelector('meta[charset]')?.getAttribute('charset').toLowerCase();
if (charset == undefined || !charset.includes('gb')) {
    let metaContent = document.querySelector('meta[http-equiv="Content-Type"]')?.getAttribute('content')?.toLowerCase();
    if (metaContent?.includes('charset')) charset = metaContent.slice(metaContent.indexOf('charset=') + 8); else charset = '';
}
if (charset.includes('gb') || lang == 'zh') lang = 'zh';
else chrome.i18n.detectLanguage(document.title, (langInfo) => {
    langInfo.languages.forEach(l => {
        lang = l.language;
        percent = l.percentage;
        return;
    })
});

loadOptions((mess) => {
    Options = mess.payload;
    let webArr = [];
    webArr = Options.optionWebsites.split(/[;,\n]/).map(w => w.trim());
    let skipWeb = webArr.reduce((skip, web) => {
        let reg = new RegExp(web, 'i');
        return skip || reg.test(window.location.hostname);
    }, false);

    if (lang?.includes('zh') && Options.optionAutoTrans && !skipWeb) {
        // const observer = new MutationObserver(oCb);
        // observer.observe(document.body, { childList: true, subtree: true, characterData: true });

        // let transObserve;
        // function oCb(mL) {
        //     clearTimeout(transObserve);
        //     if (lang == 'zh') transObserve = setTimeout(translateNode(document), 600); //trans tu dong title bi doi ????
        // }
        //oCb();
        translateNode(document)
    }
    else {
        let btnTranslate = document.createElement('button');
        btnTranslate.style.position = 'absolute';
        btnTranslate.style.top = '2px';
        btnTranslate.style.right = '2px';
        btnTranslate.style.zIndex = '9999999';
        btnTranslate.innerText = 'Translate'
        document.body.appendChild(btnTranslate); //Tai sao khong them vao???
        btnTranslate.onclick = () => { translateNode(document.body); }
    }
});


