var Li = {};
(function () {
    "use strict";
    var date = new Date(),
        year = date.getUTCFullYear(),
        month = date.getUTCMonth(),
        day = date.getUTCDay();
    Li.notWords = ["Li-setting", "" + year + "." + month + "." + day];
    Li.today = "" + year + "." + month + "." + day;
})()
Li.init = true;
Li.currentWord = {};
Li.savedWords = [];
Li.savedQuery = [];
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
                    // console.log(item.words);
                    Li.savedWords = item.words;
                }
                if (Li.savedWords && Li.savedWords.length) {
                    for (var i = 0, len = Li.savedWords.length; i < len; i++) {
                        Li.savedQuery[i] = Li.savedWords[i].word;
                    }
                }
            })
        }

        // 初始化设置
        chrome.storage.sync.get("setting", function (item) {
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
        });
        Li.inited = true;
        // console.log("init done, savedWords:");
        // console.log(Li.savedWords);
    })

    // 建立节点
    var root = document.createElement("div");
    root.innerHTML = '<div class="Li-btn-wrapper">' +
        '<button class="Li-note-btn" title="做笔记" ' +
        'id="Li-noteBtn" type="button">NOTE</button></div>' +
        '<div class="Li-translation-group-wrapper" ' +
        'id="Li-searchResult"></div>';
    root.id = "Li-root";
    root.style.paddingTop = '10px!important';
    root.style.zIndex = '999!important';
    root.style.position = 'absolute!important';
    root.style.boxShadow = '10px 10px 10px rgba(0, 0, 0, 0.4)!important';
    root.style.backgroundColor = '#fff!important';
    root.style.outline = '5px solid #eef5fe!important';
    root.style.color = '#444!important';
    root.style.width = '250px!important';
    root.style.height = '265px!important';
    root.style.display = "none";
    document.body.appendChild(root);
}

// 显示结果
Li.showResult = function (word, node, isSaved) {
    "use strict";
    // console.log("get word");
    // console.log(word);
    node.innerHTML = "";
    var group = document.createElement("div");
    group.className = "Li-translation-group";
    if (isSaved) {
        document.getElementById("Li-noteBtn").classList.add("Li-saved");
    }
    if (!!word && !Li.isEmpty(word)) {
        if (word.word) {
            if (word.word.length > 20) {
                group.innerHTML += '<p class="Li-search-item">' +
                    word.word.slice(0, 20) + '...' + '</p>';
            } else {
                group.innerHTML += '<p class="Li-search-item">' +
                    word.word + '</p>';
            }
        }
        if (word.pronun) {
            group.innerHTML += '<p class="Li-translation">发音：' + word.pronun + '</p>';
        }
        if (word.means && word.means.length > 0) {
            word.means.forEach(function (current) {
                group.innerHTML += '<p class="Li-translation">' + current + '</p>';
            });
        } else {
            group.innerHTML += '<p class="Li-search-item">很抱歉，没有找到相关的翻译</p>';
        }
    } else {
        group.innerHTML = '<p class="Li-search-item">' +
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
        chrome.runtime.sendMessage(query, function (response) {
            Li.currentWord = response;
            Li.showResult(Li.currentWord, node);
        });
    }
}

Li.listenSelect = function () {
    var root = document.getElementById("Li-root");
    root.addEventListener("mouseup", function (event) {
        event.stopPropagation();
    })
    window.addEventListener("mouseup", function (event) {
        var range = (window.getSelection && window.getSelection()) ||
            (document.getSelection && document.getSelection()),
            query = range.toString().trim(),
            root = document.
                getElementById("Li-root"),
            searchResult = document.getElementById("Li-searchResult"),
            noteBtn = document.getElementById("Li-noteBtn");
        pageX = event.pageX,
            pageY = event.pageY;
        // console.log(query);
        root.style.display = "none";
        if (!query || !Li.setting.translateSelected) {
            return;
        }
        // console.log(root);
        // 发送查询
        Li.query(query, document.getElementById("Li-searchResult"));

        // 将答案显示在页面上
        root.style.display = "block";
        if (pageX > document.body.offsetWidth * 0.6) {
            root.style.left = pageX - root.offsetWidth +
                "px";
        } else {
            root.style.left = pageX + "px";
        }
        if (top + root.offsetHeight > document.body.offsetHeight) {
            root.style.top = pageY - root.offsetHeight +
                "px";
        } else {
            root.style.top = pageY + "px";
        }
    });
}

Li.listenNoteBtnClick = function () {
    "use strict";
    var noteBtn = document.getElementById("Li-noteBtn");
    noteBtn.addEventListener("click", function (event) {
        if (noteBtn.classList.contains("Li-saved")) {
            noteBtn.classList.remove("Li-saved");
            var index = Li.savedQuery.indexOf(Li.currentWord);
            Li.savedQuery.splice(index, 1);
            Li.savedWords.splice(index, 1);
            var obj = {};
            obj.words = Li.savedWords;
            chrome.storage.sync.set(obj);
            // console.log("Li.savedWords");
            // console.log(Li.savedWords);
        } else {
            var obj = {};
            obj.words = Li.savedWords;
            noteBtn.classList.add("Li-saved");
            Li.savedQuery.push(Li.currentWord.word);
            Li.savedWords.push(Li.currentWord);
            chrome.storage.sync.set(obj);
            // console.log("Li.savedWords");
            // console.log(Li.savedWords);
        }
    });
}
Li.init();
Li.listenNoteBtnClick();
Li.listenSelect();
// console.log(5);
// 监听设置的数据变化
chrome.storage.onChanged.addListener(function (item) {
    // console.log(item);
    if (!Li.isEmpty(item) && item.setting) {
        if (item.setting.newValue.translateSelected) {
            Li.setting.translateSelected = true;
        } else {
            Li.setting.translateSelected = false;
        }
    }
});