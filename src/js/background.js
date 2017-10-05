if (!Li) {
    var Li = {};
}
Li.setting = {};
Li.setting.translateSelected = false;
// 打算使用通用的方式实现content与background的通信以及popup与background的通信，然而失败了
chrome.runtime.onConnect.addListener(function (port) {
    port.onMessage.addListener(function (msg) {
        // console.log("form popup query: " + msg);

        // 网络搜索
        function searchOnline(query) {
            var urlPrefix = "http://dict.youdao.com/fsearch?client=deskdict" +
                "&keyfrom=chrome.extension&q=",
                urlSuffix = "&pos=-1&doctype=xml&xmlVersion=3.2&dogVersion=1.0" +
                    "&vendor=unknown&appVer=3.1.17.4208&le=eng";
            var xhr = new XMLHttpRequest();
            xhr.addEventListener("readystatechange", function () {
                if (xhr.readyState === 4) {
                    if ((xhr.status >= 200 && xhr.status < 300) ||
                        xhr.status === 304) {
                        var xml = xhr.responseXML,
                            currentWord = {},
                            contents = xml.getElementsByTagName("content");

                        // 存储当前词
                        currentWord.word = xml.
                            getElementsByTagName("return-phrase")[0].textContent;
                        // 存储意思
                        if (contents) {
                            currentWord.means = [];
                            var len = contents.length;
                            for (var i = 0; i < len; i++) {
                                currentWord.means.push(contents[i].textContent);
                            }
                        }
                        // 存储发音
                        if (xml.getElementsByTagName("phonetic-symbol")[0]) {
                            currentWord.pronun = xml.
                                getElementsByTagName("phonetic-symbol")[0].
                                textContent;
                        }

                        // console.log(currentWord);
                        port.postMessage(currentWord);
                    } else {
                        port.postMessage(undefined);
                    }
                }
            });
            xhr.timeout = 2000;
            xhr.ontimeout = function () {
                port.postMessage(undefined);
            }
            xhr.open("get", urlPrefix + encodeURIComponent(query) + urlSuffix,
                true);
            xhr.send(null);
        }
        function searchOffline(query) {
            chrome.storage.local.get("words", function (item) {
                if (item.words) {
                    var savedWords = item.words;
                    savedWords.forEach(function (word) {
                        if (word.word === query) {
                            port.postMessage(word);
                            return;
                        }
                    })
                } else {
                    port.postMessage(undefined);
                }
            })
        }
        // console.log("online?: " + navigator.onLine);
        if (navigator.onLine) {
            searchOnline(msg);
        } else {
            searchOnline(msg);
        }
    })
});
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // // console.log(request);
    function searchOnline(query) {
        var urlPrefix = "http://dict.youdao.com/fsearch?client=deskdict" +
            "&keyfrom=chrome.extension&q=",
            urlSuffix = "&pos=-1&doctype=xml&xmlVersion=3.2&dogVersion=1.0" +
                "&vendor=unknown&appVer=3.1.17.4208&le=eng";
        var xhr = new XMLHttpRequest();
        xhr.addEventListener("readystatechange", function () {
            if (xhr.readyState === 4) {
                if ((xhr.status >= 200 && xhr.status < 300) ||
                    xhr.status === 304) {
                    // // console.log(xhr.response);
                    var xml = xhr.responseXML,
                        currentWord = {},
                        contents = xml.getElementsByTagName("content");

                    // 存储当前词
                    currentWord.word = xml.
                        getElementsByTagName("return-phrase")[0].textContent;
                    // 存储意思
                    if (contents) {
                        currentWord.means = [];
                        for (var i = 0, len = contents.length; i < len; i++) {
                            currentWord.means.push(contents[i].textContent);
                        }
                    }
                    // 存储发音
                    if (xml.getElementsByTagName("phonetic-symbol")[0]) {
                        currentWord.pronun = xml.
                            getElementsByTagName("phonetic-symbol")[0].
                            textContent;
                    }

                    // console.log(currentWord);
                    sendResponse(currentWord);
                } else {
                    sendResponse(undefined);
                }
            }
        });
        xhr.timeout = 2000;
        xhr.ontimeout = function () {
            sendResponse(undefined);
        }
        xhr.open("get", urlPrefix + encodeURIComponent(query) + urlSuffix,
            true);
        xhr.send(null);
    }
    function searchOffline(query) {
        chrome.storage.local.get("words", function (item) {
            if (item.words) {
                var savedWords = item.words;
                savedWords.forEach(function (word) {
                    if (word.word === query) {
                        sendResponse(word);
                        return;
                    }
                })
            } else {
                sendResponse(undefined);
            }
        })
    }
    if (navigator.onLine) {
        searchOnline();
    } else {
        searchOffline();
    }
    return true;
});

// 监听快捷键
chrome.commands.onCommand.addListener(function (command) {
    if (command === "toggle-translate-selected") {
        chrome.storage.sync.get("setting", function (item) {
            if (item.setting === undefined) {
                var obj = {};
                obj.setting = {
                    translateSelected: true
                }
                chrome.storage.sync.set(obj);
            } else {
                if (item.setting.translateSelected) {
                    var obj = {};
                    obj.setting = {
                        translateSelected: false
                    }
                    chrome.storage.sync.set(obj);
                } else {
                    var obj = {};
                    obj.setting = {
                        translateSelected: true
                    }
                    chrome.storage.sync.set(obj);
                }
            }
        })
    }
})