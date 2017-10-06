// chrome.storage.sync.get得到的item是不可枚举的，不过确实在情理之中
// 存储词汇的方式改为chrome.storage.sync.set({words: []})，数组中
// 存储词汇
if (!Li) {
    var Li = {};
}
(function () {
    "use strict";
    var date = new Date(),
        year = date.getUTCFullYear(),
        month = date.getUTCMonth(),
        day = date.getUTCDay();
    Li.notWords = ["Li-setting", "" + year + "." + month + "." + day];
    Li.today = "" + year + "." + month + "." + day;
})()
Li.currentWord = {};
Li.savedWords = [];
Li.savedQuery = [];
Li.notePageInited = false;
Li.settingPageInited = false;
Li.inited = false;
Li.port = chrome.runtime.connect({ name: "popup" });
Li.setting = {};

// 判断对象是否为{}, []
Li.isEmpty = function (obj) {
    "use strict";
    for (var i in obj) {
        return false;
    }
    return true;
}

// 初始化
Li.init = function () {
    "use strict";
    chrome.storage.sync.get("today", function (item) {
        if (item.today !== Li.today) {
            var obj = {};
            obj.today = Li.today;
            chrome.storage.sync.set(obj);

            // 陷入回调地狱。。。。存储之前的数据到local，将sync的数据清空
            chrome.storage.local.get("words", function (item) {
                var local = item.words;
                chrome.storage.sync.get("words", function (item) {
                    // console.log("sync item");
                    // console.log(item);
                    var sync = item.words,
                        local = local,
                        obj = {};
                    if (local) {
                        if (sync && length) {
                            for (var i = 0, len = sync.length; i < len; i++) {
                                local.concat(sync[i]);
                            }
                        }
                        obj.words = local;
                        if (obj.words) {
                            chrome.storage.local.set(obj, function () {
                                chrome.storage.sync.set({ words: [] });
                            });
                        }
                    }
                });
            });
        } else {
            chrome.storage.sync.get("words", function (item) {
                // console.log("item.words");
                // console.log(item.words);
                if (item.words) {
                    Li.savedWords = item.words;
                }
                for (var i = 0, len = Li.savedWords.length; i < len; i++) {
                    Li.savedQuery[i] = Li.savedWords[i].word;
                }
            })
        }
        Li.inited = true;
        // console.log("init done, savedWords:");
        // console.log(Li.savedWords);
    })
}

// 初始化notePage
Li.initNotePage = function () {
    "use strict";
    var current = document.getElementById("current"),
        total = document.getElementById("total");
    current.innerText = Li.savedWords.length > 0 ? 1 : 0;
    total.innerText = Li.savedWords.length;
    Li.notePageInited = true;
    if (Li.savedWords[0]) {
        Li.showResult(Li.savedWords[0], document.getElementById("noteResult"));
    }
}

// 初始化settingPage
Li.initSettingPage = function () {
    "use strict";
    chrome.storage.sync.get("setting", function (item) {
        var settingBtn = document.getElementById("settingBtn");
        if (item.setting) {
            Li.setting = item.setting;
        } else {
            var obj = {};
            Li.setting = {
                "translateSelected": true
            }
            obj.setting = Li.setting;
            chrome.storage.sync.set(obj);
        }
        if (Li.setting.translateSelected) {
            settingBtn.classList.add("setting-btn-show");
        } else {
            settingBtn.classList.remove("setting-btn-show");
        }
        Li.settingPageInited = true;
    });
}

// 监听页面切换
Li.listenChangePage = function () {
    "use strict";
    var toNote = document.getElementById("toNote"),
        toTranslate = document.getElementById("toTranslate"),
        toSetting = document.getElementById("toSetting"),
        translatePage = document.getElementById("translatePage"),
        settingPage = document.getElementById("settingPage"),
        notePage = document.getElementById("notePage");

    // 使页面显示
    function show(node) {
        node.classList.add("show");
    }

    // 使页面隐藏
    function hide(node) {
        node.classList.remove("show");
    }

    toNote.addEventListener("click", function () {
        Li.initNotePage();
        show(notePage);
        hide(settingPage);
    });
    toTranslate.addEventListener("click", function () {
        hide(settingPage);
        hide(notePage);
    });
    toSetting.addEventListener("click", function () {

        // 如果页面未进行初始化，则初始化
        if (!Li.settingPageInited) {
            Li.initSettingPage();
        }
        show(settingPage);
        hide(notePage);
    })
};

// 显示结果
Li.showResult = function (word, node, isSaved) {
    "use strict";
    // console.log("get word");
    // console.log(word);
    node.innerHTML = "";
    var group = document.createElement("div");
    group.className = "translation-group";
    if (isSaved) {
        document.getElementById("noteBtn").classList.add("saved");
    }
    if (!!word && !Li.isEmpty(word)) {
        if (word.word) {
            if (word.word.length > 20) {
                group.innerHTML += '<p class="search-item">' +
                    word.word.slice(0, 20) + '...' + '</p>';
            } else {
                group.innerHTML += '<p class="search-item">' +
                    word.word + '</p>';
            }
        }
        if (word.pronun) {
            group.innerHTML += '<p class="translation">发音：' + word.pronun + '</p>';
        }
        if (word.means && word.means.length > 0) {
            word.means.forEach(function (current) {
                group.innerHTML += '<p class="translation">' + current + '</p>';
            });
        } else {
            group.innerHTML += '<p class="search-item">很抱歉，没有找到相关的翻译</p>';
        }
    } else {
        group.innerHTML = '<p class="search-item">' +
            '请检查您的网络连接稍后再试</p>';
    }
    node.appendChild(group);
}

// 进行查询
Li.query = function (query, node) {
    "use strict";
    if (Li.savedQuery.indexOf(query) > -1) {

        // 如果查询的词在savedQuery中，则使用savedWords中是数据
        Li.currentWord = Li.savedWords[Li.savedQuery.indexOf(query)];
        Li.showResult(Li.currentWord, node, true);
    } else if (Li.currentWord.word && query === Li.currentWord.word) {

        // 如果查询的词是当前保存值，则显示当前值
        Li.showResult(Li.currentWord, node);
    } else {

        // 以上情况均不成立，向background发送查询
        Li.port.postMessage(query);
    }
}

// 监听enter键
Li.listenEnter = function () {
    "use strict";
    window.addEventListener("keyup", function (event) {
        if (event.keyCode === 13) {
            var node = document.getElementById("searchResult"),
                query = document.getElementById("search").value.trim();
            document.getElementById("noteBtn").classList.remove("saved");
            node.innerHTMl = '<p class="search-item">正在查询，请稍等</p>';
            if (query && !Li.isEmpty(query)) {
                Li.query(query, node);
            }
        }
    });
}

// 监听返回结果
Li.port.onMessage.addListener(function (msg) {
    "use strict";
    // console.log("get background search");
    // console.log(msg);
    Li.currentWord = msg;
    Li.showResult(Li.currentWord, document.getElementById("searchResult"));
});

// 监听note按钮
Li.listenNoteBtnClick = function () {
    "use strict";
    var noteBtn = document.getElementById("noteBtn");
    noteBtn.addEventListener("click", function () {
        if (noteBtn.classList.contains("saved")) {
            noteBtn.classList.remove("saved");
            var index = Li.savedQuery.indexOf(Li.currentWord);
            Li.savedQuery.splice(index, 1);
            Li.savedWords.splice(index, 1);
            // console.log("Li.savedWords");
            // console.log(Li.savedWords);
        } else {
            noteBtn.classList.add("saved");
            Li.savedQuery.push(Li.currentWord.word);
            Li.savedWords.push(Li.currentWord);
            // console.log("Li.savedWords");
            // console.log(Li.savedWords);
        }
        var obj = {};
        obj.words = Li.savedWords;
        chrome.storage.sync.set(obj);
    });
}

Li.listenChangeNote = function () {
    "use strict";
    var prev = document.getElementById("prev"),
        next = document.getElementById("next");
    prev.addEventListener("click", function () {
        var current = document.getElementById("current"),
            total = document.getElementById("total"),
            currentNum = parseInt(current.innerText),
            totalNum = parseInt(total.innerText);
        if (totalNum === 0) {
            return;
        } else if (currentNum === 1) {
            current.innerText = totalNum;
            Li.showResult(Li.savedWords[parseInt(current.innerText) - 1],
                document.getElementById("noteResult"));
        } else {
            current.innerText = currentNum - 1;
            Li.showResult(Li.savedWords[parseInt(current.innerText) - 1],
                document.getElementById("noteResult"));
        }
    });
    next.addEventListener("click", function () {
        var current = document.getElementById("current"),
            total = document.getElementById("total"),
            currentNum = parseInt(current.innerText),
            totalNum = parseInt(total.innerText);
        if (totalNum === 0) {
            return;
        } else if ((currentNum + 1) > totalNum) {
            current.innerText = 1;
            Li.showResult(Li.savedWords[0],
                document.getElementById("noteResult"));
        } else {
            current.innerText = currentNum + 1;
            Li.showResult(Li.savedWords[parseInt(current.innerText) - 1],
                document.getElementById("noteResult"));
        }
    })
}

Li.listenSettingBtnClick = function () {
    var settingBtn = document.getElementById("settingBtn");
    settingBtn.addEventListener("click", function () {
        // console.log(Li.setting.translateSelected);
        if (Li.setting.translateSelected) {
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
    })
}

Li.listenCopyBtnClick = function () {
    var copyBtn = document.getElementById("copyBtn");
    copyBtn.addEventListener("click", function () {
        // 使用command实现复制
        var transferP = document.getElementById('LiCopyTransferP'),
            transferTextarea = document.getElementById("transferTextarea");
        if (!transferP || !transferTextarea) {
            transferP = document.createElement('p');
            transferP.id = 'LiCopyTransferP';
            transferP.style.position = 'fixed';
            transferP.style.left = '-9999px';
            transferP.style.top = '-9999px';
            document.body.appendChild(transferP);
            transferTextarea = document.createElement('textarea');
            transferTextarea.id = 'LiCopyTransferTextarea';
            transferTextarea.style.position = 'fixed';
            transferTextarea.style.left = '-9999px';
            transferTextarea.style.top = '-9999px';
            document.body.appendChild(transferTextarea);
        }
        transferP.innerHTML = "";
        Li.savedWords.forEach(function (word) {
            if (word.word) {
                transferP.innerHTML += word.word + "<br>";
            }
            if (word.pronun) {
                transferP.innerHTML += "发音：" + word.pronun + '<br>';
            }
            if (word.means && word.means.length > 0) {
                word.means.forEach(function (current) {
                    transferP.innerHTML += current + '<br>';
                });
            }
        });
        transferTextarea.value = transferP.innerText;
        transferTextarea.focus();
        transferTextarea.select();
        document.execCommand('Copy', false, null);
        // console.log("copy done");
    })
}

Li.init();
Li.listenChangePage();
Li.listenEnter();
Li.listenNoteBtnClick();
Li.listenChangeNote();
Li.listenSettingBtnClick();
Li.listenCopyBtnClick();

// 卸载页面前存储数据，减少数据操作
window.addEventListener("beforeunload", function () {

    // 判断页面初始化是否完成，防止过快地快关页面致使数据丢失
    if (Li.inited) {
        var obj = {};
        obj.words = Li.savedWords;
        chrome.storage.sync.set(obj);
    }
});

// 监听设置的数据变化
chrome.storage.onChanged.addListener(function (item) {
    // console.log(item);
    if (!Li.isEmpty(item) && item.setting) {
        var settingBtn = document.getElementById("settingBtn");
        if (item.setting.newValue.translateSelected) {
            settingBtn.classList.add("setting-btn-show");
            Li.setting.translateSelected = true;
        } else {
            settingBtn.classList.remove("setting-btn-show");
            Li.setting.translateSelected = false;
        }
    }
});