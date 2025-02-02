(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var util = require('./util');
var patch = require('./patch');
var listDiff = require('list-diff2');

function diff(oldTree, newTree) {
    var index = 0;
    var patches = {};
    dfsWalk(oldTree, newTree, index, patches);
    return patches;
}


function dfsWalk(oldNode, newNode, index, patches) {
    var currentPatch = [];
    if (newNode === null) {
        //渚濊禆listdiff绠楁硶杩涜鏍囪涓哄垹闄?
    } else if (util.isString(oldNode) && util.isString(newNode)) {
        if (oldNode !== newNode) {
            //濡傛灉鏄枃鏈妭鐐瑰垯鐩存帴鏇挎崲鏂囨湰
            currentPatch.push({
                type: patch.TEXT,
                content: newNode
            });
        }
    } else if (oldNode.tagName === newNode.tagName && oldNode.key === newNode.key) {
        //鑺傜偣绫诲瀷鐩稿悓
        //姣旇緝鑺傜偣鐨勫睘鎬ф槸鍚︾浉鍚?
        var propsPatches = diffProps(oldNode, newNode);
        if (propsPatches) {
            currentPatch.push({
                type: patch.PROPS,
                props: propsPatches
            });
        }
        //姣旇緝瀛愯妭鐐规槸鍚︾浉鍚?
        diffChildren(oldNode.children, newNode.children, index, patches, currentPatch);
    } else {
        //鑺傜偣鐨勭被鍨嬩笉鍚岋紝鐩存帴鏇挎崲
        currentPatch.push({ type: patch.REPLACE, node: newNode });
    }

    if (currentPatch.length) {
        patches[index] = currentPatch;
    }
}

function diffProps(oldNode, newNode) {
    var count = 0;
    var oldProps = oldNode.props;
    var newProps = newNode.props;
    var key, value;
    var propsPatches = {};

    //鎵惧嚭涓嶅悓鐨勫睘鎬?
    for (key in oldProps) {
        value = oldProps[key];
        if (newProps[key] != value) {
            count++;
            propsPatches[key] = newProps[key];
        }
    };

    //鎵惧嚭鏂板鐨勫睘鎬?
    for (key in newProps) {
        value = newProps[key];
        if (!oldProps.hasOwnProperty(key)) {
            count++;
            propsPatches[key] = newProps[key];
        }
    }

    if (count === 0) {
        return null;
    }

    return propsPatches;
}


function diffChildren(oldChildren, newChildren, index, patches, currentPatch) {
    var diffs = listDiff(oldChildren, newChildren, 'key');
    newChildren = diffs.children;

    if (diffs.moves.length) {
        var reorderPatch = {
            type: patch.REORDER,
            moves: diffs.moves
        };
        currentPatch.push(reorderPatch);
    }

    var leftNode = null;
    var currentNodeIndex = index;
    util.each(oldChildren, function(child, i) {
        var newChild = newChildren[i];
        currentNodeIndex = (leftNode && leftNode.count) ? currentNodeIndex + leftNode.count + 1 : currentNodeIndex + 1;
        dfsWalk(child, newChild, currentNodeIndex, patches);
        leftNode = child;
    });
}


module.exports = diff;

},{"./patch":5,"./util":6,"list-diff2":3}],2:[function(require,module,exports){
var velement = require('./velement');
var diff = require('./diff');
var patch = require('./patch');
var vdom = velement('div', { 'id': 'container' }, [
    velement('h1', { style: 'color:red' }, ['simple virtual dom']),
    velement('p', ['hello world']),
    velement('ul', [velement('li', ['item #1']), velement('li', ['item #2'])]),
]);
var rootnode = vdom.render();
document.body.appendChild(rootnode);
var newVdom = velement('div', { 'id': 'container' }, [
    velement('h5', { style: 'color:red' }, ['simple virtual dom']),
    velement('p', ['hello world']),
    velement('ul', [velement('li', ['item #1']), velement('li', ['item #2']), velement('li', ['item #3'])]),
]);

var patches = diff(vdom, newVdom);
console.log("newVdom",newVdom)
console.log(JSON.stringify(patches));
//鑾峰彇鍒板彉鍔ㄥ悗锛屽紑濮嬮亶鍘嗙湡瀹瀌om锛屼粠root鑺傜偣寮€濮嬮亶鍘?
patch(rootnode,patches);

},{"./diff":1,"./patch":5,"./velement":7}],3:[function(require,module,exports){
module.exports = require('./lib/diff').diff

},{"./lib/diff":4}],4:[function(require,module,exports){
/**
 * Diff two list in O(N).
 * @param {Array} oldList - Original List
 * @param {Array} newList - List After certain insertions, removes, or moves
 * @return {Object} - {moves: <Array>}
 *                  - moves is a list of actions that telling how to remove and insert
 */
function diff (oldList, newList, key) {
  var oldMap = makeKeyIndexAndFree(oldList, key)
  var newMap = makeKeyIndexAndFree(newList, key)

  var newFree = newMap.free

  var oldKeyIndex = oldMap.keyIndex
  var newKeyIndex = newMap.keyIndex

  var moves = []

  // a simulate list to manipulate
  var children = []
  var i = 0
  var item
  var itemKey
  var freeIndex = 0

  // fist pass to check item in old list: if it's removed or not
  while (i < oldList.length) {
    item = oldList[i]
    itemKey = getItemKey(item, key)
    if (itemKey) {
      if (!newKeyIndex.hasOwnProperty(itemKey)) {
        children.push(null)
      } else {
        var newItemIndex = newKeyIndex[itemKey]
        children.push(newList[newItemIndex])
      }
    } else {
      var freeItem = newFree[freeIndex++]
      children.push(freeItem || null)
    }
    i++
  }

  var simulateList = children.slice(0)

  // remove items no longer exist
  i = 0
  while (i < simulateList.length) {
    if (simulateList[i] === null) {
      remove(i)
      removeSimulate(i)
    } else {
      i++
    }
  }

  // i is cursor pointing to a item in new list
  // j is cursor pointing to a item in simulateList
  var j = i = 0
  while (i < newList.length) {
    item = newList[i]
    itemKey = getItemKey(item, key)

    var simulateItem = simulateList[j]
    var simulateItemKey = getItemKey(simulateItem, key)

    if (simulateItem) {
      if (itemKey === simulateItemKey) {
        j++
      } else {
        // new item, just inesrt it
        if (!oldKeyIndex.hasOwnProperty(itemKey)) {
          insert(i, item)
        } else {
          // if remove current simulateItem make item in right place
          // then just remove it
          var nextItemKey = getItemKey(simulateList[j + 1], key)
          if (nextItemKey === itemKey) {
            remove(i)
            removeSimulate(j)
            j++ // after removing, current j is right, just jump to next one
          } else {
            // else insert item
            insert(i, item)
          }
        }
      }
    } else {
      insert(i, item)
    }

    i++
  }

  function remove (index) {
    var move = {index: index, type: 0}
    moves.push(move)
  }

  function insert (index, item) {
    var move = {index: index, item: item, type: 1}
    moves.push(move)
  }

  function removeSimulate (index) {
    simulateList.splice(index, 1)
  }

  return {
    moves: moves,
    children: children
  }
}

/**
 * Convert list to key-item keyIndex object.
 * @param {Array} list
 * @param {String|Function} key
 */
function makeKeyIndexAndFree (list, key) {
  var keyIndex = {}
  var free = []
  for (var i = 0, len = list.length; i < len; i++) {
    var item = list[i]
    var itemKey = getItemKey(item, key)
    if (itemKey) {
      keyIndex[itemKey] = i
    } else {
      free.push(item)
    }
  }
  return {
    keyIndex: keyIndex,
    free: free
  }
}

function getItemKey (item, key) {
  if (!item || !key) return void 666
  return typeof key === 'string'
    ? item[key]
    : key(item)
}

exports.makeKeyIndexAndFree = makeKeyIndexAndFree // exports for test
exports.diff = diff

},{}],5:[function(require,module,exports){
var util = require('./util');
/*********************************patch*************************************/
//鐢ㄤ簬璁板綍涓や釜铏氭嫙dom涔嬮棿宸紓鐨勬暟鎹粨鏋?

//姣忎釜鑺傜偣鏈夊洓绉嶅彉鍔?
var REPLACE = 0;
var REORDER = 1;
var PROPS = 2;
var TEXT = 3;

function patch(node, patches) {
    var walker = {
        index: 0
    };
    dfsWalk(node, walker, patches);
}

patch.REPLACE = REPLACE;
patch.REORDER = REORDER;
patch.PROPS = PROPS;
patch.TEXT = TEXT;

//娣卞害浼樺厛閬嶅巻dom缁撴瀯
function dfsWalk(node, walker, patches) {
    //杩欓噷鏄粠鐪熷疄DOM鏍硅妭鐐瑰紑濮嬮亶鍘嗭紝
    console.log("dfswalk 鎺ュ彈鍒扮殑鍙樺姩鍙傛暟",JSON.stringify(patches))
    var currentPatches = patches[walker.index];
    console.log("currentPatches",walker.index,JSON.stringify(currentPatches))
    var len = node.childNodes ? node.childNodes.length : 0;
    for (var i = 0; i < len; i++) {
        var child = node.childNodes[i];
        walker.index++;
        dfsWalk(child, walker, patches);
    }
    //濡傛灉褰撳墠鑺傜偣瀛樺湪宸紓
    if (currentPatches) {
        applyPatches(node, currentPatches);
    }
}

function applyPatches(node, currentPatches) {
    util.each(currentPatches, function(currentPatch) {
        switch (currentPatch.type) {
            case REPLACE:
                var newNode = (typeof currentPatch.node === 'String') ? document.createTextNode(currentPatch.node) : currentPatch.node.render();
                node.parentNode.replaceChild(newNode, node);
                break;
            case REORDER:
                reoderChildren(node, currentPatch.moves);
                break;
            case PROPS:
                setProps(node, currentPatch.props);
                break;
            case TEXT:
                if (node.textContent) {
                    node.textContent = currentPatch.content;
                } else {
                    node.nodeValue = currentPatch.content;
                }
                break;
            default:
                throw new Error('Unknow patch type ' + currentPatch.type);
        }
    });
}

function reoderChildren(node, moves) {
    var staticNodeList = util.toArray(node.childNodes);
    var maps = {};
    util.each(staticNodeList, function(node) {
        if (node.nodeType === 1) {
            var key = node.getAttribute('key');
            if (key) {
                maps[key] = node;
            }
        }
    });

    util.each(moves, function(move) {
        var index = move.index;
        if (move.type === 0) { // 鍙樺姩绫诲瀷涓哄垹闄よ妭鐐?
            if (staticNodeList[index] === node.childNodes[index]) {
                node.removeChild(node.childNodes[index]);
            }
            staticNodeList.splice(index, 1);
        } else {
            var insertNode = maps[move.item.key] 
                ? maps[move.item.key] : (typeof move.item === 'object') 
                ? move.item.render() : document.createTextNode(move.item);
            staticNodeList.splice(index, 0, insertNode);
            node.insertBefore(insertNode, node.childNodes[index] || null);
        }
    });
}


function setProps(node, props) {
    for (var key in props) {
        if (props[key] === void 666) {
            node.removeAttribute(key);
        } else {
            var value = props[key];
            util.setAttr(node, key, value);
        }
    }
}

module.exports = patch;
},{"./util":6}],6:[function(require,module,exports){
/*********************************杈呭姪绫籾til*************************************/
//杈呭姪绫?Util
var util = {};

util.type = function(obj) {
    return Object.prototype.toString.call(obj).replace(/\[object\s|\]/g, '');
}

util.isArray = function(list) {
    return util.type(list) === 'Array';
}

util.isString = function(list) {
    return util.type(list) == 'String';
}

util.each = function(array, fn) {
    for (var i = 0, len = array.length; i < len; i++) {
        fn(array[i], i);
    }
}

util.toArray = function(listLike) {
    if (!listLike) {
        return [];
    }
    var list = [];
    for (var i = 0, len = listLike.length; i < len; i++) {
        list.push(listLike[i]);
    }
    return list;
}

util.setAttr = function(node, key, value) {
    switch (key) {
        case 'style':
            node.style.cssText = value;
            break;
        case 'value':
            var tagName = node.tagName || '';
            tagName = tagName.toLowerCase();
            if (tagName === 'input' || tagName === 'textarea') {
                node.value = value;
            } else {
                node.setAttribute(key, value);
            }
            break;
        default:
            node.setAttribute(key, value);
            break;
    }
}


module.exports = util;

},{}],7:[function(require,module,exports){
var util = require('./util');
//铏氭嫙dom
var VElement = function(tagName, props, children) {
    //淇濊瘉鍙兘閫氳繃濡備笅鏂瑰紡璋冪敤锛歯ew VElement
    if (!(this instanceof VElement)) {
        return new VElement(tagName, props, children);
    }

    //鍙互閫氳繃鍙紶閫抰agName鍜宑hildren鍙傛暟
    if (util.isArray(props)) {
        children = props;
        props = {};
    }

    //璁剧疆铏氭嫙dom鐨勭浉鍏冲睘鎬?
    this.tagName = tagName;
    this.props = props || {};
    this.children = children || [];
    this.key = props ? props.key : void 666;
    var count = 0;
    util.each(this.children, function(child, i) {
        if (child instanceof VElement) {
            count += child.count;
        } else {
            children[i] = '' + child;
        }
        count++;
    });
    this.count = count;
}

//鏍规嵁铏氭嫙dom鍒涘缓鐪熷疄dom
VElement.prototype.render = function() {
    //鍒涘缓鏍囩
    var el = document.createElement(this.tagName);
    //璁剧疆鏍囩鐨勫睘鎬?
    var props = this.props;
    for (var propName in props) {
        var propValue = props[propName]
        util.setAttr(el, propName, propValue);
    }

    //涓€娆″垱寤哄瓙鑺傜偣鐨勬爣绛?
    util.each(this.children, function(child) {
        //濡傛灉瀛愯妭鐐逛粛鐒朵负velement锛屽垯閫掑綊鐨勫垱寤哄瓙鑺傜偣锛屽惁鍒欑洿鎺ュ垱寤烘枃鏈被鍨嬭妭鐐?
        var childEl = (child instanceof VElement) ? child.render() : document.createTextNode(child);
        el.appendChild(childEl);
    });

    return el;
}

module.exports = VElement;
},{"./util":6}]},{},[2]);
