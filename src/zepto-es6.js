((window) => {
  const class2type = {},
    classCache = {},
    elementDisplay = {},
    hasOwnProperty = class2type.hasOwnProperty,
    emptyArray = [],
    isArray = emptyArray.isArray || Array.isArray,
    toArray = emptyArray.from || Array.from,
    concat = emptyArray.concat,
    toString = class2type.toString,
    document = window.document,
    fragmentRE = /^\s*<(\w+|!)[^>]*>/,
    singleTagRE = /^<(\w+)\s*\/?>(?:<\/\1>|)$/,
    rootNodeRE = /^(?:body|html)$/i,
    tagExpanderRE = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,
    methodAttributes = ['val', 'css', 'html', 'text', 'data', 'width', 'height', 'offset'],
    adjacencyOperators = ['after', 'prepend', 'before', 'append'],
    cssNumber = {
      'column-count': 1,
      columns: 1,
      'font-weight': 1,
      'line-height': 1,
      opacity: 1,
      'z-index': 1,
      zoom: 1
    },
    propMap = {
      tabindex: 'tabIndex',
      readonly: 'readOnly',
      for: 'htmlFor',
      class: 'className',
      maxlength: 'maxLength',
      cellspacing: 'cellSpacing',
      cellpadding: 'cellPadding',
      rowspan: 'rowSpan',
      colspan: 'colSpan',
      usemap: 'useMap',
      frameborder: 'frameBorder',
      contenteditable: 'contentEditable'
    },
    simpleSelectorRE = /^[\w-]*$/,
    rdashAlpha = /-([a-z])/g,
    readyRE = /complete|loaded|interactive/,
    tempParent = document.createElement('div'),
    table = document.createElement('table'),
    tableRow = document.createElement('tr'),
    containers = {
      tr: document.createElement('tbody'),
      tbody: table,
      thead: table,
      tfoot: table,
      td: tableRow,
      th: tableRow,
      '*': document.createElement('div')
    };
  let $,
    matches;

  'Boolean Number String Function Array Date RegExp Object Error Symbol'.split(' ')
    .forEach((str) => {
      class2type[`[object ${str}]`] = str.toLowerCase();
    });
  const classRE = name =>
    name in classCache ?
    classCache[name] :
    (classCache[name] = new RegExp(`(^|\\s)${name}(\\s|$)`));

  const className = (node, value) => {
    const klass = node.className || '',
      svg = klass && klass.baseVal !== undefined;
    if (value === undefined) {
      return svg ? klass.baseVal : klass;
    }
    if (svg) {
      klass.baseVal = value;
    } else {
      node.className = value;
    }
  };

  const funcArg = (context, arg, idx, payload) =>
    $.isFunction(arg) ? arg.call(context, idx, payload) : arg;

  const setAttribute = (node, name, value) => {
    if (value != null) {
      node.setAttribute(name, value);
    } else {
      node.removeAttribute(name);
    }
  };

  const type = (obj) => {
    if (obj == null) {
      return String(obj);
    }
    return class2type[toString.call(obj)] || 'object';
  };

  const isDocument = obj => obj != null && obj.nodeType === obj.DOCUMENT_NODE;

  const arrayLike = (obj) => {
    const len = !!obj && 'length' in obj && obj.length;
    const objType = type(obj);
    if (objType === 'function' || $.isWindow(obj)) {
      return false;
    }
    /* eslint no-mixed-operators: "off"*/
    return objType === 'array' || len === 0 ||
      (typeof len === 'number' && len > 0 && (len - 1) in obj);
  };

  const compact = arr => arr.filter(item => item != null);

  const fcamelCase = (mathc, str) => str ? str.toUpperCase() : '';

  const dasherize = str => str.replace(/::/g, '/')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .replace(/_/g, '-')
    .toLowerCase();

  const dimensionProperty = str => str.replace(/./, m => m[0].toUpperCase());

  const deserializeValue = (value) => {
    try {
      return value ?
        (value === 'true' ||
          value === 'false' ? false :
          value === 'null' ? null :
          `${value}` === value ? +value :
          /^[[{]/g.test(value) ? JSON.parse(value) : value) :
        value;
    } catch (e) {
      return value;
    }
  };


  const children = node => 'children' in node ? toArray(node.children) :
    $.map(node.childNodes, (child) => {
      if (child.nodeType === 1) {
        return child;
      }
    });

  const getStyles = (elem, value) => {
    let view = elem.ownerDocument.defaultView;
    if (!view) {
      view = window;
    }
    const computedStyle = view.getComputedStyle(elem);

    return elem.style[$.camelCase(value)] || computedStyle.getPropertyValue(value);
  };


  const maybeAddPx = (property, value) =>
    (typeof value === 'number' && !cssNumber[dasherize(property)]) ?
    `${value}px` : value;

  const setDimension = (context, style, value) => {
    let offset;
    const node = context.dom[0];
    const dimension = dimensionProperty(style);
    if (value === undefined) {
      console.log(node[`inner${dimension}`]);
      return $.isWindow(node) ?
        node[`inner${dimension}`] :
        isDocument(node) ? node.documentElement[`scroll${dimension}`] :
        (offset = context.offset()) && offset[style];
    }
    return context.css(dimension, value);
  };

  const getParent = (elem) => {
    let parent = elem.offsetParent || document.body;
    while (parent && !rootNodeRE.test(parent.nodeName) && getStyles(parent, 'position') === 'static') {
      parent = parent.offsetParent;
    }
    return parent;
  };
  // 其实我也不懂为什么还要重新获取display
  const defaultDisplay = (nodeName) => {
    if (!elementDisplay[nodeName]) {
      const element = document.createElement(nodeName);
      document.body.appendChild(element);
      let display = getStyles(element, 'display');
      element.parentNode.removeChild(element);
      if (display === 'none') {
        display = 'block';
      }
      elementDisplay[nodeName] = display;
    }
    return elementDisplay[nodeName];
  };

  class Z {
    constructor(selector, context) {
      this.dom = [];
      this.selector = selector;
      this.init(selector, context);
    }
    init(selector, context) {
      if (!selector) {
        // 没有对象，返回一个空的构造函数
        this.dom = [];
      } else if ($.isZ(selector)) {
        // 选择器本身是Z的实例，则返回相同实例
        this.dom = selector.dom;
        this.selector = selector.selector;
      } else if (typeof selector === 'string') {
        this.selector = selector.trim();
        // 匹配开头是<的标签 "<p>Hello</p>" "<p />"
        if (this.selector[0] === '<' && fragmentRE.test(selector)) {
          this.dom = Z.fragment(selector, RegExp.$1, context);
          // $('p', 'li')
        } else if (context !== undefined) {
          console.log('has context');
          this.dom = (this.dom = Z.qsa(document, context)) && Z.qsa(this.dom, selector);
        } else {
          // $('#foo')属性选择器
          this.dom = Z.qsa(document, selector);
        }
      } else if ($.isFunction(selector)) {
        // 传入是函数就调用页面加载函数 类似jq;
        this.dom = [];
        this.selector = null;
        return $(document).ready(selector);
      } else if ($.isArray(selector)) {
        // 如果selector是一个数组，则将其里面的null,undefined去掉
        this.dom = compact(selector);
      } else if ($.isObject(selector)) {
        // window document
        this.dom = [selector];
        this.selector = null;
        return;
      } else if (fragmentRE.test(selector)) {
        // 如果selector是一段HTML代码片断，则将其转换成DOM节点
        console.log('fragmentRE');
        this.dom = Z.fragment(selector.trim(), RegExp.$1, context);
      } else if (context !== undefined) {
        this.dom = (this.dom = Z.qsa(document, context)) && Z.qsa(this.dom, selector);
      } else {
        this.dom = Z.qsa(document, selector);
      }
    }
    add(selector, context) {
      if (context) {
        // const curDom = $(selector, context).dom;
        this.dom = [...this.dom, ...$(selector, context)
          .dom];
      } else {
        this.dom = Z.uniq([...(Z.qsa(document, selector)), ...this.dom]);
      }
      this.selector = selector;
      return this;
    }
    hasClass(name) {
      if (!name) {
        return false;
      }
      // 不使用箭头函数是因为需要this,指向classRE生产的正则
      return emptyArray.some.call(this.dom, function (elem) {
        return this.test(className(elem));
      }, classRE(name));
    }
    addClass(name) {
      if (!name) {
        return this;
      }
      this.dom.forEach((idx) => {
        if (!('className' in idx)) {
          return;
        }
        const cls = className(idx),
          newName = funcArg(this, name, idx, cls),
          classList = [];
        newName.split(' ')
          .forEach((klass) => {
            if (!$(idx)
              .hasClass(klass)) {
              classList.push(klass);
            }
          });
        if (classList.length) {
          className(idx, cls + (cls ? ' ' : '') + classList.join(' '));
        }
      });
      return this;
    }
    removeClass(name) {
      if (!name) {
        return this;
      }
      this.dom.forEach((idx) => {
        if (!('className' in idx)) {
          return;
        }
        let classList = className(idx);
        funcArg(this, name, idx, classList)
          .split(' ')
          .forEach((klass) => {
            classList = classList.replace(classRE(klass), ' ');
          });
        className(idx, classList.trim());
      });
      return this;
    }
    toggleClass(name, when) {
      this.dom.forEach((elem) => {
        const $this = $(elem),
          names = funcArg(this, name, elem, className(elem));
        names.split(' ')
          .forEach((klass) => {
            const flag = when === undefined ? !$this.hasClass(klass) : when;
            if (flag) {
              $this.addClass(klass);
            } else {
              $this.removeClass(klass);
            }
          });
      });
      return this;
    }
    css(property, value, element = this.dom[0]) {
      if (arguments.length < 2) {
        if (type(property) === 'string') {
          return getStyles(element, property);
        } else if ($.isArray(property)) {
          const props = {};
          property.forEach((prop) => {
            props[prop] = getStyles(element, prop);
          });
          return props;
        }
      }

      let css = '';
      if (type(property) === 'string') {
        if (!value) {
          this.dom.forEach((elem) => {
            elem.style.removeProperty(dasherize(property));
          });
        } else {
          css = `${dasherize(property)}:${maybeAddPx(property, value)}`;
        }
      } else {
        for (const key in property) {
          if (hasOwnProperty.call(property, key)) {
            css += `${dasherize(key)}:${maybeAddPx(key, property[key])};`;
          } else {
            this.dom.forEach((elem) => {
              elem.style.removeProperty(dasherize(key));
            });
          }
        }
      }


      if (arguments.length > 2) {
        element.style.cssText += `;${css}`;
      } else {
        this.dom.forEach((elem) => {
          elem.style.cssText += `;${css}`;
        });
      }
      return this;
    }
    height(value) {
      return setDimension(this, 'height', value);
    }
    width(value) {
      return setDimension(this, 'width', value);
    }
    hide() {
      this.css('display', 'none');
      return this;
    }
    show() {
      this.dom.forEach((elem) => {
        if (elem.style.display === 'none') {
          elem.style.display = '';
        }
        if (getStyles(elem, 'display') === 'none') {
          elem.style.display = defaultDisplay(elem.nodeName);
        }
      });
      return this;
    }
    toggle(setting) {
      const flag = setting === undefined ? getStyles(this.dom[0], 'display') === 'none' : setting;
      if (flag) {
        this.show();
      } else {
        this.hide();
      }
      return this;
    }
    offset(coordinates, dom = this.dom[0]) {
      if (coordinates) {
        return this.dom.forEach((elem) => {
          const parentOffset = this.offset(null, elem);
          const props = {
            left: coordinates.left - parentOffset.left,
            top: coordinates.top - parentOffset.top
          };
          if (getStyles(elem, 'position') === 'static') {
            props.position = 'relative';
          }
          this.css(props, null, elem);
        });
      }
      if (!this.dom.length) {
        return null;
      }
      if (document.documentElement !== this.dom[0] &&
        !$.contains(document.documentElement, this.dom[0])) {
        return {
          top: 0,
          left: 0
        };
      }

      const dimensionObj = dom.getBoundingClientRect();
      const left = dimensionObj.left + window.pageXOffset;
      const top = dimensionObj.top + window.pageYOffset;
      const width = Math.round(dimensionObj.width);
      const height = Math.round(dimensionObj.height);
      return {
        left,
        top,
        width,
        height
      };
    }
    offsetParent() {
      return Z.uniq(this.map(elem => getParent(elem)));
    }
    position() {
      if (!this.dom.length) {
        return this;
      }
      const elem = this.dom[0],
        parentElem = this.offsetParent(),
        offset = this.offset(),
        parentOffset = rootNodeRE.test(parentElem[0].nodeName) ? {
          top: 0,
          left: 0
        } :
        this.offset(null, parentElem[0]);

      offset.top -= parseFloat(getStyles(elem, 'margin-top')) || 0;
      offset.left -= parseFloat(getStyles(elem, 'margin-left')) || 0;

      parentOffset.top += parseFloat(getStyles(parentElem[0], 'border-top-width')) || 0;
      parentOffset.left += parseFloat(getStyles(parentElem[0], 'border-left-width')) || 0;
      return {
        top: offset.top - parentOffset.top,
        left: offset.left - parentOffset.left
      };
    }
    scrollLeft(value) {
      if (!this.dom.length) {
        return this;
      }
      const hasScrollLeft = 'scrollLeft' in this.dom[0];
      if (!value) {
        return hasScrollLeft ? this.dom[0].scrollLeft : this.dom[0].pageXOffset;
      }
      this.dom.forEach(hasScrollLeft ? (elem) => {
        elem.scrollLeft = value;
      } : (elem) => {
        elem.scrollTo(value, elem.scrollY);
      });
      return this;
    }
    scrollTop(value) {
      if (!this.dom.length) {
        return this;
      }
      const hasScrollTop = 'scrollTop' in this.dom[0];
      if (!value) {
        return hasScrollTop ? this.dom[0].scrollTop : this.dom[0].pageYOffset;
      }
      this.dom.forEach(hasScrollTop ? (elem) => {
        elem.scrollTop = value;
      } : (elem) => {
        elem.scrollTo(elem.scrollX, value);
      });
      return this;
    }

    remove() {
      return this.dom.forEach((elem) => {
        if (elem.parentNode !== undefined) {
          elem.parentNode.removeChild(elem);
        }
      });
    }
    data(name, value) {
      const attrName = `data-${name.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      const data = value ? this.attr(attrName, value) : this.attr(attrName);
      return data !== null ? deserializeValue(data) : undefined;
    }
    empty() {
      this.dom.forEach((elem) => {
        elem.innerHTML = '';
      });
      return this;
    }
    size() {
      return this.dom.length;
    }
    get(idx) {
      return idx !== undefined ? this.dom[idx >= 0 ? idx : idx + this.dom.length] : this.dom;
    }
    has(selector) {
      return selector != null ? $.contains(this.dom, selector) : false;
    }
    find(selector) {
      const length = this.dom.length;
      if (!selector) {
        return this;
      }
      // 对象集合 {}|| []
      if (typeof selector === 'object') {
        this.filter(selector);
      }
      if (length === 1) {
        this.dom = Z.qsa(this.dom[0], selector);
      } else {
        this.dom = Z.qsa(this.dom, selector);
      }

      this.selector = selector;
      return this;
    }
    filter(selector) {
      this.selector = selector || this.selector;
      this.dom = this.dom.filter(element => matches(element, selector));
      return this;
    }
    parent() {
      this.dom = Z.uniq(this.pluck('parentNode'));
      return this;
    }
    parents(selector) {
      const ancestors = [];
      this.dom.forEach((node) => {
        while (node && (node = node.parentNode) && !isDocument(node) && ancestors.indexOf(node)) {
          ancestors.push(node);
        }
      });
      this.dom = Z.uniq(ancestors);
      if (selector) {
        this.selector = selector;
        this.dom = Z.uniq(Z.qsa(this.dom, selector));
      }
      return this;
    }
    closest(selector, context) {
      const collection = typeof selector === 'object' && $(selector);
      const nodes = [];
      this.dom.forEach((node) => {
        while (node &&
          !(collection ? collection.dom.indexOf(node) >= 0 : matches(node, selector))) {
          node = node !== context && !isDocument(node) && node.parentNode;
        }
        if (node && nodes.indexOf(node)) {
          nodes.push(node);
        }
      });
      return $(Z.uniq(nodes));
    }

    children(selector) {
      if (!selector) {
        this.dom = this.map(elem => children(elem));
      } else {
        this.selector = selector;
        this.dom = Z.qsa(this.dom, selector);
      }
      return this;
    }
    siblings(selector) {
      if (!selector) {
        return Z.uniq(this.map(elem => emptyArray.filter.call(children(elem.parentNode),
          child => child !== elem)));
      }
      return Z.qsa(document, selector);
    }
    pluck(property) {
      return this.map(elem => elem[property]);
    }
    concat(...nodes) {
      this.dom = concat.call(this.dom, ...nodes);
      return this;
    }
    clone() {
      return this.map(elem => elem.cloneNode(true));
    }
    contents() {
      return this.map(elem => elem.contentDocument || toArray(elem.childNodes));
    }
    first() {
      this.dom = this.dom[0];
      return this;
    }
    last() {
      const length = this.dom.length;
      this.dom = this.dom[length - 1];
      return this;
    }
    slice(start, end) {
      return emptyArray.slice.call(this.dom, start, end);
    }
    eq(idx) {
      this.dom = idx === -1 ? this.dom.slice(-1) : this.dom.slice(idx, +idx + 1);
      return this;
    }
    attr(name, value) {
      if (!name) {
        return this;
      }
      const length = this.dom.length;
      let result;
      return typeof name === 'string' ?
        (length === 1 && this.dom[0].nodeType === 1 &&
          (result = this.dom[0].getAttribute(name)) != null ?
          result : undefined) :
        this.dom.forEach((elem) => {
          if (elem.nodeType !== 1) {
            return;
          }
          if ($.isObject(name)) {
            for (const key in name) {
              if (hasOwnProperty.call(name, key)) {
                setAttribute(elem, key, name[key]);
              }
            }
          } else {
            setAttribute(elem, name, funcArg(this, value, elem, elem.getAttribute(name)));
          }
        });
    }
    removeAttr(names) {
      this.dom.forEach((elem) => {
        if (elem.nodeType === 1) {
          names.split('').forEach((name) => {
            setAttribute(elem, name);
          });
        }
      });
      return this;
    }
    prop(...args) {
      const name = propMap[[...args][0]] || [...args][0];
      return 1 in [...args] ?
        this.dom.forEach((elem) => {
          elem[name] = args[1];
        }) :
        (this.dom[0] && this.dom[0].name);
    }
    removeProp(name) {
      name = propMap[name] || name;
      this.dom.forEach((elem) => {
        delete elem[name];
      });
      return this;
    }
    map(callback) {
      return $.map(this.dom, callback);
    }
    text(text) {
      if (text != null) {
        this.dom.forEach((elem) => {
          elem.textContent = `${text}`;
        });
        return this;
      }

      return this.dom[0] ? this.pluck('textContent')
        .join('') : null;
    }
    val(value) {
      if (!value) {
        return this.dom[0] && (this.dom[0].multiple ?
          $(this.dom[0])
          .find('options')
          .dom.filter(elem => elem.selected)
          .value : this.dom[0].value);
      }
      this.dom.forEach((elem) => {
        elem.value = value;
      });
      return this;
    }

    html(html) {
      return html !== undefined ?
        this.dom.forEach((elem) => {
          const originHtml = elem.innerHTML;
          $(elem)
            .empty()
            .append(funcArg(this, html, elem, originHtml));
        }) :
        (this.dom[0] ? this.dom[0].innerHTML : null);
    }
    index(element) {
      return element !== undefined ?
        this.dom.indexOf(...$(element)
          .dom) :
        this.parent()
        .children()
        .dom.indexOf(...$(this.selector)
          .dom);
    }
    is(selector) {
      return this.dom.length > 0 && matches(this.dom[0], selector);
    }
    next(selector) {
      return selector !== null ? Z.qsa(document, selector) :
        this.pluck('previousElementSibling');
    }
    prev(selector) {
      return selector !== null ? Z.qsa(document, selector) :
        this.pluck('nextElementSibling');
    }
    replaceWith(newContent) {
      this.before(newContent).remove();
      return this;
    }
    unwrap() {
      this.parent().dom.forEach((elem) => {
        $(elem).replaceWith($(elem).children().dom);
      });
      return this;
    }
    wrap(structure) {
      const func = $.isFunction(structure);
      let clone,
        dom;
      if (this.dom[0] && !func) {
        dom = $(structure)
          .get(0);
        clone = dom.parentNode || this.dom.length > 1;
      }
      this.dom.forEach((elem) => {
        $(elem)
          .wrapAll(func ?
            func.call(this, elem) :
            clone ? elem.cloneNode(true) : dom);
      });
      return this;
    }

    wrapAll(structure) {
      if (this.dom[0]) {
        let newStructure = $(structure);
        $(this.dom[0]).before(newStructure.dom);
        let curChildren;
        console.log(newStructure.children());
        while (curChildren = newStructure.children().dom.length) {
          newStructure = curChildren.first();
        }
        $(newStructure).append(this.dom);
      }
    }
    ready(callback) {
      if (readyRE.test(document.readyState) && document.body) {
        callback($);
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          callback($);
        }, false);
      }
      return this;
    }
    static fragment(html, name, properties) {
      let dom,
        nodes,
        container;
      if (singleTagRE.test(html)) {
        // 将类似<div class="test"/>替换成<div class="test"></div>
        dom = $(document.createElement(RegExp.$1));
      }
      if (!dom) {
        // area|br|col|embed|hr|img|input|link|meta|param特殊的标签修复成一对
        html = html.replace && html.replace(tagExpanderRE, '<$1></$2>');
        // 没有传参数则重新获取标签名
        name = name === undefined && (fragmentRE.test(html) && RegExp.$1);
        // 设置容器标签名，如果不是tr,tbody,thead,tfoot,td,th，则容器标签名为div
        name = !(name in containers) && '*';
        // 适配特殊的标签
        container = containers[name];
        container.innerHTML = `${html}`;
        dom = toArray(container.childNodes);
        dom.forEach((node) => {
          container.removeChild(node);
        });
      }
      // 如果properties是对象, 则将其当作属性来给添加进来的节点进行设置
      // $("<p />", { text:"Hello", id:"greeting", css:{color:'darkblue'} })
      if ($.isPlainObject(properties)) {
        nodes = $(dom);
        $.each(properties, (key, value) => {
          // 如果设置的是'val', 'css', 'html', 'text', 'data', 'width',
          // 'height', 'offset'，则调用zepto上相对应的方法
          if (methodAttributes.indexOf(key) > -1) {
            nodes[key](value);
          } else {
            nodes.attr(key, value);
          }
        });
      }
      // 返回将字符串转成的DOM节点后的数组，比如'<li></li><li></li><li></li>'转成[li,li,li]
      return dom;
    }
    static qsa(element, selector) {
      let found;
      const maybeID = selector[0] === '#';
      const maybeClass = selector[0] === '.';
      const nameOnly = (maybeID || maybeClass) ? selector.slice(1) : selector; // tag
      const isSimple = simpleSelectorRE.test(nameOnly);

      if ($.isArray(element)) {
        console.log('is array');
        found = [];
        element.forEach((elem) => {
          const curDom = Z.qsa(elem, selector);
          found.push(...curDom);
        });
      } else {
        found = (isSimple && element.getElementById && maybeID) ?
          ((found = element.getElementById(nameOnly)) ? [found] : []) :
          // 当element不为元素节点|document| DocumentFragment 时
          (element.nodeType !== 1 && element.nodeType !== 9 && element.nodeType !== 11) ? [] :
          toArray(
            (isSimple && !maybeID && element.getElementsByClassName) ?
            // maybeClass
            (maybeClass ? element.getElementsByClassName(nameOnly) :
              // tag
              element.getElementsByTagName(selector)) :
            element.querySelectorAll(selector)
          );
      }

      return found;
    }
    static uniq(array) {
      // 消除重复的数组元素
      return emptyArray.filter.call(array, (arr, i) => array.indexOf(arr) === i);
    }
  }
  matches = (element, selector) => {
    if (!selector || !element || element.nodeType !== 1) {
      return false;
    }
    const matchesSelector = element.matchesSelector || element.mozMatchesSelector ||
      element.webkitMatchesSelector || element.msMatchesSelector || element.oMatchesSelector;
    if (matchesSelector) {
      return matchesSelector.call(element, selector);
    }

    let parent = element.parent;
    const temp = !parent;
    if (temp) {
      (parent = tempParent)
      .appendChild(element);
    }
    const match = ~(Z.qsa(parent, selector)
      .indexOf(element));
    if (temp) {
      tempParent.removeChild(element);
    }
    return match;
  };
  const traverseNode = (node, fun) => {
    for (let i = 0; i < node.childNodes.length; i++) {
      traverseNode(node.childNodes[i], fun(node));
    }
  };

  adjacencyOperators.forEach((operator, operatorIndex) => {
    const inside = operatorIndex % 2;

    Z.prototype[operator] = function (...argus) {
      const copyByClone = this.dom.length > 1;
      const nodes = $.map([...argus], (arg) => {
        const argType = type(...argus),
          arr = [];
        if (argType === 'array') {
          arg.forEach((node) => {
            if (node.nodeType !== undefined) {
              arr.push(node);
            } else if ($.isZ(node)) {
              arr.concat(node.get());
            }
            arr.concat(Z.fragment(node));
          });
          return arr;
        }
        return argType === 'object' || (arg === null ? arg : Z.fragment(arg));
      });
      if (nodes.length < 1) {
        return this;
      }

      this.dom.forEach((elem) => {
        const parent = inside ? elem : elem.parentNode;
        // after，target等于下一个兄弟元素，然后将DOM通过insertBefore插入到target前
        const target = operatorIndex === 0 ? elem.nextSibling :
          // prepend target为parent的第一个元素，然后将DOM通过insertBefore插入到target前
          operatorIndex === 1 ? elem.firstChild :
          // before  直接将将DOM通过insertBefore插入到target前
          operatorIndex === 2 ? elem :
          //  append  直接调用$(target).append
          null;

        const parentInDocument = $.contains(document.documentElement, target);

        nodes.forEach((node) => {
          if (copyByClone) {
            node = node.cloneNode(true);
          } else if (!parent) {
            return $(node)
              .remove();
          }

          parent.insertBefore(node, target);
          if (parentInDocument) {
            traverseNode(node, (el) => {
              if (el.nodeName !== null && el.nodeName.toUpperCase() === 'SCRIPT' &&
                (!el.type || el.type === 'text/javascript') && !el.src) {
                const view = el.ownerDocument ? el.ownerDocument.deafultView : window;
                view[eval].call(view, el.innerHTML);
              }
            });
          }
        });
      });
      return this;
    };
    // after    => insertAfter 0
    // prepend  => prependTo 1
    // before   => insertBefore 2
    // append   => appendTo 3
    Z.prototype[inside ? `${operator}To` : `insert${operatorIndex ? 'Before' : 'After'}`] = function (html) {
      $(html)[operator](this.dom);
      return this;
    };
  });


  $ = function (selector, context) {
    return new Z(selector, context);
  };
  $.fn = $.prototype = Z.prototype;
  $.isWindow = obj => !!obj && obj === obj.window;
  $.isObject = obj =>
    !!obj && typeof obj === 'object' && type(obj) === 'object';
  $.isPlainObject = obj =>
    $.isObject(obj) && !$.isWindow(obj) && Object.getPrototypeOf(obj) === Object.prototype;

  $.isZ = obj => obj instanceof Z;

  $.isFunction = obj =>
    !!obj && class2type[toString.call(obj)] === 'function' && typeof obj === 'function';

  $.isArray = obj => !!obj && isArray(obj) || (obj instanceof Array);

  $.isNumeric = (obj) => {
    const objType = type(obj);
    return (objType === 'number' || objType === 'string') && !isNaN(obj);
  };
  $.each = (values, callback) => {
    let len,
      i = 0;
    if (arrayLike(values)) {
      len = values.length;
      for (; i < len; i++) {
        if (callback.call(values[i], i, values[i]) === false) {
          break;
        }
      }
    } else {
      for (i in values) {
        if (callback.call(values[i], i, values[i]) === false) {
          break;
        }
      }
    }
  };

  $.map = (values, callback) => {
    const ret = [];
    let len,
      val,
      key,
      i = 0;
    if (arrayLike(values)) {
      len = values.length;
      for (; i < len; i++) {
        val = callback.call(values[i], values[i], i);
        if (val != null) {
          ret.push(val);
        }
      }
    } else {
      for (key in values) {
        if (hasOwnProperty.call(values, key)) {
          val = callback.call(values[key], values[key], key);
          if (val != null) {
            ret.push(val);
          }
        }
      }
    }
    return concat.call([], ...ret);
  };

  $.camelCase = str => str.replace(rdashAlpha, fcamelCase);

  $.contains = (parent, node) => {
    if (document.documentElement.contains) {
      return parent !== node && parent.contains(node);
    }
    for (; node;
      (node = node.parentNode)) {
      if (node === parent) {
        return true;
      }
    }
    return false;
  };

  $.extend = (...args) => {
    const length = [...args].length;
    let target = [...args][0] || {},
      deep = false,
      i = 0;
    if (typeof target === 'boolean' && target === true) {
      deep = target;
      target = [...args][1] || {};
      i++;
    }
    let options,
      name,
      src,
      copy,
      copyIsArray,
      clone;
    for (; i < length; i++) {
      if ((options = [...args][i]) != null) {
        for (name in options) {
          if (hasOwnProperty.call(options, name)) {
            src = target[name];
            copy = options[name];
            copyIsArray = $.isArray(copy);
            if (src === copy) {
              continue;
            }
            if (deep && ($.isPlainObject(copy) || copyIsArray)) {
              if (copyIsArray) {
                copyIsArray = false;
                clone = (src && $.isArray(src)) ? src : [];
              } else {
                clone = (src && $.isPlainObject(src)) ? src : {};
              }
              target[name] = $.extend(deep, clone, copy);
            } else if (copy != null) {
              target[name] = copy;
            }
          }
        }
      }
    }
    return target;
  };
  $.grep = (arr, callback) => arr.filter.call(arr, callback);

  $.inArray = (element, arr, i) => !!~(emptyArray.indexOf.call(arr, element, i));

  $.noop = function () {};

  if (window.JSON) $.parseJSON = JSON.parse;

  $.trim = str => str != null ? String.prototype.trim.call(str) : '';
  $.type = type;
  window.Zepto = $;
  window.$ = window.$ === undefined && window.Zepto;
  // event
  (($) => {
    const
      handlers = {},
      specialEvents = {},
      slice = Array.prototype.slice,
      isFunction = $.isFunction,
      isString = str => typeof str === 'string',
      ignoreProperties = /^([A-Z]|returnValue$|layer[XY]$|webkitMovement[XY]$)/,
      eventMethods = {
        preventDefault: 'isDefaultPrevented',
        stopImmediatePropagation: 'isImmediatePropagationStopped',
        stopPropagation: 'isPropagationStopped'
      },
      focusinSupported = 'onfocusin' in window,
      focus = { focus: 'focusin', blur: 'focusout' },
      hover = {
        mouseenter: 'mouseover',
        mouseleave: 'mouseout'
      };
    ['click', 'mouseup', 'mousedown', 'mousemove'].forEach((eventType) => {
      specialEvents[eventType] = 'MouseEvents';
    });

    let _zid = 1;
    const returnFalse = () => false;
    const returnTrue = () => true;

    const zid = element => element._zid || (element._zid = _zid++);

    const parse = (eventName) => {
      const parts = `${eventName}`.split('.');
      return {
        e: parts[0],
        ns: parts.slice(1).sort().join(' ')
      };
    };

    const matcherFor = ns => new RegExp(`(?:^| )${ns.replace(' ', ' .* ?')}(?: |$)`);

    // 封装代理preventDefault  stopImmediatePropagation   stopPropagation等方法
    // 判断source.defaultPrevented 赋值event.isDefaultPrevented
    const compatible = (event, source) => {
      if (source || !event.isDefaultPrevented) {
        if (!source) {
          source = event;
        }
        $.each(eventMethods, (name, predicate) => {
          const sourceMethod = source[name];
          // 扩展event对象，代理preventDefault  stopImmediatePropagation stopPropagation方法
          // 扩展兼容浏览器不支持，同时做其他事情
          event[name] = function (...argus) {
            // 如果执行了3方法，原生事件对象isDefaultPrevented
            // isImmediatePropagationStopped  isPropagationStopped 三方法标记true
            this[predicate] = returnTrue;
            return sourceMethod && sourceMethod.apply(source, ...argus);
          };
          event[predicate] = returnFalse;
        });
        if (!event.timeStamp) {
          event.timeStamp = Date.now();
        }
        if (source.defaultPrevented !== undefined ? source.defaultPrevented :
          ('returnValue' in source ? source.returnValue === false : source.getPreventDefault) &&
          source.getPreventDefault()) {
          event.isDefaultPrevented = returnTrue;
        }
      }
      return event;
    };


    const createProxy = (event) => {
      const proxy = {
        originalEvent: event
      };
      for (const key in proxy) {
        if ({}.hasOwnProperty.call(proxy, key) && !ignoreProperties.test(key) &&
          event[key] !== undefined) {
          proxy[key] = event[key];
        }
      }
      return compatible(proxy, event);
    };

    const realEvent = event => hover[event] || (focusinSupported && focus[event]) || event;

    const eventCapture = (handler, capture) => handler.del &&
      (!focusinSupported && (handler.e in focus)) || !!capture;

    const findHandlers = (elem, event, fn, selector) => {
      const newEvent = parse(event);
      let matcher;
      if (newEvent.ns) {
        // 生成自己的正则规则
        matcher = matcherFor(newEvent.ns);
      }
      return (handlers[zid(elem)] || [])
        .filter(handler => handler && (!newEvent.e || handler.e === newEvent.e) &&
          (!newEvent.ns || matcher.test(handler.ns)) &&
          (!fn || zid(handler.fn) === zid(fn)) && (!selector || handler.sel === selector)
        );
    };


    // elem, event, callback, data, selector, delegator || autoRemove
    const add = (element, events, fn, data, selector, delegator, capture) => {
      // 读取元素上已绑定的事件处理函数
      const id = zid(element),
        set = handlers[id] || (handlers[id] = []);
      events.split(/\s/).forEach((event) => {
        if (event === 'ready') {
          return $(document).ready(fn);
        }
        // 解析事件   {e: * 事件类型 , ns: string 命名空间}
        const handler = parse(event);
        handler.fn = fn;
        handler.sel = selector;
        // 模仿 mouseenter, mouseleave为了变成都冒泡的事件
        // 如果事件是mouseenter, mouseleave，模拟mouseover mouseout事件处理
        if (handler.e in hover) {
          // relatedTarget 事件属性返回与事件的目标节点相关的节点。
          // 对于 mouseover 事件来说，该属性是鼠标指针移到目标节点上时所离开的那个节点。
          // 对于 mouseout 事件来说，该属性是离开目标时，鼠标指针进入的节点。
          //  对于其他类型的事件来说，这个属性没有用。
          fn = function (e) {
            const related = e.relatedTarget;
            if (!related || (related !== this && !$.contains(this, related))) {
              return handler.fn.apply(this, arguments);
            }
          };
        }

        handler.del = delegator;

        const callback = delegator || fn;
        handler.proxy = function (e) {
          e = compatible(e);
          if (e.isImmediatePropagationStopped()) {
            return;
          }
          e.data = data;
          const result = callback.apply(element, e._args === undefined ? [e] : [e].concat(e._args));
          if (result) {
            e.preventDefault();
            e.stopPropagation();
          }
          return result;
        };
        handler.i = set.length;
        set.push(handler);
        if ('addEventListener' in element) {
          // focus, blur 的时候设置useCapture = true(默认是false) 用于捕获事件委托
          element.addEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler,
          capture));
        }
      });
    };
    const remove = (elem, events, callback, selector, capture) => {
      const id = zid(elem);
      (events || ' ')
      .split(/\s/)
        .forEach((event) => {
          findHandlers(elem, event, callback, selector)
            .forEach((handler) => {
              delete handlers[id][handler.i];
              if ('removeEventListener' in elem) {
                elem.removeEventListener(realEvent(handler.e),
                  handler.proxy, eventCapture(handler, capture));
              }
            });
        });
    };

    $.fn.on = function (event, selector, data, callback, one) {
      const nodes = this.dom;
      let delegator,
        autoRemove;
      // event { type: handler, type2: handler2, ... }
      if (event && !isString(event)) {
        $.each(event, (eventType, fn) => {
          this.on(eventType, selector, data, fn, one);
        });
        return this;
      }
      // 未传data    on('click',{ss:'ss'},function(){})
      if (!isString(selector) && !isFunction(callback) && callback !== false) {
        callback = data;
        data = selector;
        selector = undefined;
      }
      // on('click','.ss',function(){})  或   on('click','.ss',false)
      if (callback === undefined || data === false) {
        callback = data;
        data = undefined;
      }
      // callback传了false，转换成false函数
      if (callback === false) {
        callback = returnFalse;
      }
      return nodes.forEach((elem) => {
        if (one) {
          autoRemove = function (e) {
            remove(elem, e.type, callback);
            return callback.apply(this, arguments);
          };
        }

        if (selector) {
          delegator = function (e) {
            const match = $(e.target)
              .closest(selector, elem)
              .get(0);
            if (match && match !== elem) {
              const evt = $.extend(createProxy(e), {
                currentTarget: match,
                liveFired: elem
              });
              return (autoRemove || callback)
                .apply(match, [evt].concat(slice.call(arguments, 1)));
            }
          };
        }
        add(elem, event, callback, data, selector, delegator || autoRemove);
      });
    };
    $.fn.off = function (event, selector, callback) {
      const nodes = this.dom;
      if (event && !isString(event)) {
        $.each(event, (eventType, fn) => {
          this.off(eventType, selector, fn);
        });
        return this;
      }
      // this.off("click",function(){})
      if (!isString(selector) && isFunction(callback) && callback !== false) {
        callback = selector;
        selector = undefined;
      }
      if (callback === false) {
        callback = returnFalse;
      }

      return nodes.forEach((elem) => {
        remove(elem, event, callback, selector);
      });
    };
    $.fn.one = function (event, selector, data, callback) {
      return this.on(event, selector, data, callback, 1);
    };
    $.fn.bind = function (event, data, callback) {
      return this.on(event, data, callback);
    };
    $.fn.unbind = function (event, callback) {
      return this.off(event, callback);
    };
    $.fn.delegate = function (selector, event, callback) {
      return this.on(event, selector, callback);
    };
    $.fn.undelegate = function (selector, event, callback) {
      return this.off(event, selector, callback);
    };
    $.fn.triggerHandler = function (event, args) {
      let result;
      this.dom.forEach((node) => {
        const e = createProxy(isString(event) ? $.Event(event) : event);
        e._args = args;
        e.target = node;
        findHandlers(node, e).forEach((handler) => {
          result = handler.proxy;
          if (e.isImmediatePropagationStopped()) {
            return false;
          }
        });
      });
      return result;
    };
    $.fn.trigger = function (event, args) {
      const newEvent = isString(event) || $.isPlainObject(event) ?
        $.Event(event) : compatible(event);
      newEvent._args = args;
      return this.dom.forEach((node) => {
        if (newEvent.type in focus && typeof node[newEvent.type] === 'function') {
          node[newEvent.type]();
        } else if ('dispatchEvent' in node) {
          node.dispatchEvent(newEvent);
        } else {
          $(node).triggerHandler(event, args);
        }
      });
    };
    /* eslint new-cap: 'off'*/
    $.Event = function (eventType, props) {
      const options = {
        bubbles: true
      };
      if (!isString(eventType)) {
        props = eventType;
        eventType = props.type;
      }
      if (props) {
        for (const name in props) {
          if ({}.hasOwnProperty.call(props, name)) {
            options[name] = props[name];
          }
        }
      }
      const event = new CustomEvent(specialEvents[eventType] || eventType || 'Events', options);
      return compatible(event);
    };
    $.proxy = (...args) => {
      const fn = args[0],
        context = args[1];
      const newArgs = 2 in args && args.slice(2);
      if (isFunction(args[0])) {
        const proxyFn = (...otherArgs) => fn.apply(context,
          newArgs ? otherArgs.concat(newArgs) : otherArgs);
        proxyFn._zid = zid(fn);
        return proxyFn;
      } else if (isString(context)) {
        if (newArgs) {
          newArgs.unshift(fn[context], fn);
          fn(...newArgs);
        } else {
          return $.proxy(fn[context], fn);
        }
      }
    };


    ('focusin focusout focus blur load resize scroll unload click dblclick ' +
      'mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave ' +
      'change select keydown keypress keyup error')
    .split(' ')
      .forEach((event) => {
        $.fn[event] = function (callback) {
          return (0 in arguments) ?
            this.bind(event, callback) :
            this.trigger(event);
        };
      });
  })($);
  // JSON
  (($) => {
    const originAnchor = document.createElement('a'),
      escape = encodeURIComponent,
      jsonType = 'application/json',
      htmlType = 'text/html',
      rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      scriptTypeRE = /^(?:text|application)\/javascript/i,
      xmlTypeRE = /^(?:text|application)\/xml/i,
      blankRE = /^\s*$/;
    let hashIndex;
    originAnchor.href = window.location.href;

    function empty() {}

    $.ajaxSettings = {
      type: 'GET',
      beforeSend: empty,
      success: empty,
      error: empty,
      complete: empty,
      context: null,
      global: true,
      xhr: () => new window.XMLHttpRequest(),
      accepts: {
        script: 'application/javascript, text/javascript, application/x-javascript',
        json: jsonType,
        html: htmlType,
        text: 'text/plain',
        xml: 'application/xml, text/xml'
      },
      crossDomain: false,
      timeout: 0,
      processData: true,
      cache: true,
      dataFilter: empty
    };

    const triggerAndReturn = (context, eventName, data) => {
      const event = $.Event(eventName);
      // console.log(event);
      $(context).trigger(event, data);
      return !event.isDefaultPrevented();
    };
    const triggerGlobal = (settings, context, eventName, data) =>
      settings.global && triggerAndReturn(context || document, eventName, data);

    $.active = 0;
    const ajaxStart = (settings) => {
      if (settings.global && $.active++ === 0) {
        // settings.global   是否触发ajax的全局事件 null ==> document
        triggerGlobal(settings, null, 'ajaxStart');
      }
    };
    const ajaxStop = (settings) => {
      if (settings.global && !(--$.active)) {
        // settings.global   是否触发ajax的全局事件 null ==> document
        triggerGlobal(settings, null, 'ajaxStop');
      }
    };
    const appendQuery = (url, query) => query === '' ? url : `${url}&${query}`.replace(/[&?]{1,2}/, '?');
    const serializeData = (settings) => {
      if (settings.processData && settings.data && $.type(settings.data) !== 'string') {
        settings.data = $.param(settings.data, settings.processData);
      }
      if (settings.data && (settings.type && settings.type.toUpperCase() === 'GET' ||
        settings.dataType === 'jsonp')) {
        settings.url = appendQuery(settings.url, settings.data);
        settings.data = undefined;
      }
    };
    const ajaxBeforeSend = (xhr, settings) => {
      const context = settings.context;
      if (settings.beforeSend.call(context, xhr, settings) === false ||
        triggerGlobal(settings, context, 'ajaxBeforeSend', [xhr, settings]) === false) {
        return false;
      }
      triggerGlobal(settings, context, 'ajaxSend', [xhr, settings]);
    };
    // status: "success", "notmodified", "error", "timeout", "abort", "parsererror"
    const ajaxComplete = (status, xhr, settings) => {
      const context = settings.context;
      settings.complete.call(context, xhr, status);
      triggerGlobal(settings, context, 'ajaxComplete', [xhr, settings]);
      ajaxStop(settings);
    };
    // type: "timeout", "error", "abort", "parsererror"
    const ajaxError = (error, eventType, xhr, settings, deferred) => {
      const context = settings.context;
      settings.error.call(context, xhr, eventType, settings);
      if (deferred) {
        deferred.rejectWith(context, [xhr, eventType, error]);
      }
      triggerGlobal(settings, context, 'ajaxError', [xhr, settings, error || eventType]);
      ajaxComplete(eventType, xhr, settings);
    };
    const ajaxSuccess = (data, xhr, settings, deferred) => {
      const context = settings.context;
      const status = 'success';
      settings.success.call(context, data, status, xhr);
      if (deferred) {
        deferred.rejectWith(context, [data, status, xhr]);
      }
      triggerGlobal(settings, context, 'ajaxSuccess', [xhr, settings, data]);
      ajaxComplete(status, xhr, settings);
    };
    const ajaxDataFilter = (data, dataType, settings) => {
      if (settings.dataFilter === empty) {
        return data;
      }
      const context = settings.context;
      settings.dataFilter.call(context, data, dataType);
    };
    const mimeToDataType = (mime) => {
      if (mime) {
        mime = mime.split(';', 2)[0];
      }
      return mime && (mime === htmlType ? 'html' :
        mime === jsonType ? 'json' :
        scriptTypeRE.test(mime) ? 'script' :
        xmlTypeRE.test(mime) && 'xml') || 'text';
    };

    $.ajaxJSONP = (settings, deferred) => {
      if (!('type' in settings)) {
        return $.ajax(settings);
      }
      const _callbackName = settings.jsonpCallback,
        callbackName = ($.isFunction(_callbackName) ? _callbackName() : _callbackName) ||
         `Zepto${Date.now() + 1}`,
        script = document.createElement('script');

      let originalCallback = window[callbackName],
        abortTimeout,
        responseData;
       // 中断请求，抛出error事件
       // 这里不一定能中断script的加载，但在下面阻止回调函数的执行
      const abort = (errorType) => {
        $(script).triggerHandler('error', errorType || 'abort');
      };
      const xhr = { abort: abort };
      if (deferred) {
        deferred.promise(xhr);
      }

      if (ajaxBeforeSend(xhr, settings) === false) {
        abort('abort');
        return xhr;
      }
      // 回调函数设置,给后台执行此全局函数，数据塞入
      window[callbackName] = function () {
        responseData = arguments;
      };

      script.src = settings.url.replace(/\?(.+)=\?/, `?$1=${callbackName}`);
      document.head.appendChild(script);

      $(script).on('load error', (e, errorType) => {
        clearTimeout(abortTimeout);

        $(script).off();
        $(script).remove();

        if (e.type === 'error' || !responseData) {
          ajaxError(null, errorType || 'error', xhr, settings, deferred);
        } else {
          ajaxSuccess(responseData[0], xhr, settings, deferred);
        }
        window[callbackName] = originalCallback;
        if (responseData && $.isFunction(originalCallback)) {
          originalCallback(responseData);
        }
        // 清空闭包引用的变量值，不清空，需闭包释放，
        // 父函数才能释放。清空，父函数可以直接释放
        originalCallback = responseData = undefined;
      });

      if (settings.timeout > 0) {
        abortTimeout = setTimeout(() => {
          abort('timeout');
        }, settings.timeout);
      }

      return xhr;
    };


    $.ajax = (options) => {
      const settings = $.extend({}, options || {}),
        deferred = $.Deferred && $.Deferred();

      for (const key in $.ajaxSettings) {
        if ({}.hasOwnProperty.call($.ajaxSettings, key) && settings[key] === undefined) {
          settings[key] = $.ajaxSettings[key];
        }
      }
      ajaxStart(settings);


      if (!settings.crossDomain) {
        const urlAnchor = document.createElement('a');
        urlAnchor.href = settings.url;
        urlAnchor.href = urlAnchor.href;
        // 通过比较当前页面的协议加网址和传入参数比较判断是不是跨域
        settings.crossDomain = `${originAnchor.protocol}//${originAnchor.host}` !==
          `${urlAnchor.protocol}//${urlAnchor.host}`;
      }
      // 未设置url，取当前地址栏
      if (!settings.url) {
        // 等同与window.location.href;
        settings.url = window.location.toString();
      }
      // 如果有hash，截掉hash，因为hash  ajax不会传递到后台,舍弃#和#后面的
      if ((hashIndex = settings.url.indexOf('#')) > -1) {
        settings.url = settings.url.slice(0, hashIndex);
      }
      // 将url进行序列化
      serializeData(settings);

      // 有xxx.html?a=1?=cccc类似形式，为jsonp
      let dataType = settings.dataType;
      const hasPlaceholder = /\?.+=\?/.test(settings.url);

      if (settings.cache === false ||
        ((options && options.cache !== true) &&
          (dataType === 'script' || dataType === 'jsonp'))) {
        settings.url = appendQuery(settings.url, `_=${Date.now()}`);
      }

      if (dataType === 'jsonp' && !hasPlaceholder) {
        settings.url = appendQuery(settings.url,
          settings.jsonp ? `${settings.jsonp}=?` :
          settings.jsonp === false ? '' : 'callback=?');
        return $.ajaxJSONP(settings, deferred);
      }
      // 如果不是jsonp
      const
        headers = {},
        setHeader = (name, value) => {
          headers[name.toUpperCase()] = [name, value];
        },
        protocol = /^([\w-]+:)\/\//.test(settings.url) ? RegExp.$1 : window.loction.protocol,
        xhr = settings.xhr(),
        nativeSetHeader = xhr.setRequestHeader;
      let mime = settings.accepts[dataType],
        abortTimeout;

      if (deferred) {
        deferred.promise(xhr);
      }
      // 如果没有跨域则表示异步
      // x-requested-with  null//表明同步
      if (!settings.crossDomain) {
        setHeader('X-Requested-With', 'XMLHttpRequest');
      }
      setHeader('Accept', mime || '/*');
      if ((mime = settings.mimeType) || mime) {
        if (mime.indexOf(',') > -1) {
          mime = mime.split(',', 2)[0];
        }
        if (xhr.overrideMimeType) {
          // 对Mozilla的修正
          // 来自服务器的响应没有 XML mime-type 头部(header)，则一些版本的 Mozilla浏览器不能正常运行。
          // 对于这种情况，xhr.overrideMimeType(mime); 语句将覆盖发送给服务器的头部，强制mime 作为 mime-type。*/
          xhr.overrideMimeType(mime);
        }
      }
      // 如果不是Get请求，设置Content-Type 若method==post，
      // 则请求头部的Content-Type默认设置'application/x-www-form-urlencoded
      // Content-Type: 内容类型  指定响应的 HTTP内容类型。决定浏览器将以什么形式、什么编码读取这个文件.  如果未指定 ContentType，默认为TEXT/HTML。
      /*
        application/x-www-form-urlencoded：是一种编码格式，窗体数据被编码为名称/值对，是标准的编码格式。
        当action为get时候，
        浏览器用x-www-form-urlencoded的编码方式
        把form数据转换成一个字串（name1=value1&name2=value2...），
        然后把这个字串append到url后面，用?分割，加载这个新的url。 当action为post时候，浏览器把form数据封装到http body中，然后发送到server
      */
      if (settings.contentType || (settings.contentType !== false &&
          settings.data && settings.type.toUpperCase() !== 'GET')) {
        setHeader('Content-Type', settings.contentType || 'application/x-www-form-urlencoded');
      }

      if (settings.headers) {
        for (const name in settings.headers) {
          if ({}.hasOwnProperty.call(settings.headers, name)) {
            setHeader(name, settings.headers[name]);
          }
        }
      }
      xhr.setRequestHeader = headers;

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          xhr.onreadystatechange = empty;
          clearTimeout(abortTimeout);
          let result,
            error = false;
          // >=200 && < 300 表示成功
          // 304 文件未修改 成功
          // xhr.status == 0 && protocol == 'file:'  未请求，打开的本地文件，非localhost  ip形式
          if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304 || (xhr.status === 0 && protocol === 'file:')) {
            // 获取媒体类型
            // mimeToDataType:转换成易读的类型  html,json,scirpt,xml,text等
            dataType = dataType || mimeToDataType(settings.mimeType || xhr.getResponseHeader('content-type'));
            if (xhr.responseType === 'arrayBuffer' || xhr.responseType === 'Bolo') {
              result = xhr.response;
            } else {
              // DOMString 此次请求的响应为文本
              result = xhr.responseText;
            }
            // 对响应值，根据媒体类型，做数据转换
            try {
              result = ajaxDataFilter(result, dataType, settings);
              if (dataType === 'script') {
                // http://perfectionkills.com/global-eval-what-are-the-options/
                (1, eval)(result);
              } else if (dataType === 'xml') {
                result = xhr.responseXML;
              } else if (dataType === 'json') {
                result = blankRE.test(result) ? null : $.parseJSON(result);
              }
            } catch (e) {
              error = e;
            }
            if (error) {
              return ajaxError(error, 'parsererror', xhr, settings, deferred);
            }
          }
        }
      };

      if (ajaxBeforeSend(xhr, settings) === false) {
        xhr.abort();
        ajaxError(null, 'abort', xhr, settings, deferred);
        return xhr;
      }

      const async = 'async' in settings ? settings.async : true;

      xhr.open(settings.type, settings.url, async, settings.username, settings.password);

      // xhrFields 设置  如设置跨域凭证 withCredentials
      if (settings.xhrFields) {
        for (const name in settings.xhrFields) {
          if ({}.hasOwnProperty.call(settings.xhrFields, name)) {
            xhr[name] = settings.xhrFields[name];
          }
        }
      }

      for (const name in headers) {
        if ({}.hasOwnProperty.call(headers, name)) {
          nativeSetHeader.apply(xhr, headers[name]);
        }
      }

      if (settings.timeout > 0) {
        abortTimeout = setTimeout(() => {
          xhr.onreadystatechange = empty;
          xhr.abort();
          ajaxError(null, 'timeout', xhr, settings, deferred);
        }, settings.timeout);
      }
      xhr.send(settings.data ? settings.data : null);
      return xhr;
    };
    const serialize = (params, obj, traditional, scope) => {
      const array = $.isArray(obj),
        hash = $.isPlainObject(obj);
      $.each(obj, (key, value) => {
        const valueType = $.type(value);
        if (scope) {
          // 传统的意思就是比如现有一个数据{a:[1,2,3]}
          // 转成查询字符串后结果为'a=1&a=2&a=3'
          key = traditional ? scope :
            `${scope}[${hash || valueType === 'array' || valueType === 'object' ? key : ''}]`;
        }
        // 当处理的数据为[{},{},{}]这种情况的时候，一般指的是序列化表单后的结果
        if (!scope && array) {
          params.add(value.name, value.value);
        } else if (valueType === 'array' || (!traditional && valueType === 'object')) {
          // 当value值是数组或者是对象且不是按传统的方式序列化的时候，需要再次遍历value
          serialize(params, value, traditional, key);
        } else {
          params.add(key, value);
        }
      });
    };
    const parseArguments = (url, data, success, dataType) => {
      if ($.isFunction(data)) {
        dataType = success;
        success = data;
        data = undefined;
      }
      if (!$.isFunction(success)) {
        dataType = success;
        success = undefined;
      }
      return {
        url,
        data,
        success,
        dataType
      };
    };

    $.get = (...argus) => $.ajax(parseArguments(...argus));
    $.post = (...argus) => {
      const options = parseArguments(...argus);
      options.type = 'POST';
      return $.ajax(options);
    };

    $.getJSON = function () {
      const options = parseArguments(...arguments);
      options.dataType = 'json';
      return $.ajax(options);
    };
    $.fn.load = function (url, data, success) {
      if (!this.dom.length) {
        return this;
      }
      const parts = url.split(/\s/),
        options = parseArguments(url, data, success),
        callback = options.success;
      let selector;
      if (parts.length > 1) {
        options.url = parts[0];
        selector = parts[1];
      }
      options.success = (...response) => {
        this.html(selector ? $('<div>').html(response.replace(rscript, '')).find(selector) : response);
        if (callback) {
          callback.call(this, ...response);
        }
      };
      $.ajax(options);
      return this;
    };
    $.param = (obj, traditional) => {
      const params = [];
      params.add = function (key, value) {
        if ($.isFunction(value)) {
          value = value();
        }
        if (value === null) {
          value = '';
        }
        this.push(`${escape(key)}=${escape(value)}`);
      };
      serialize(params, obj, traditional);
      return params.join('&').replace(/%20/g, '+');
    };
  })($);
  // fx
  (($) => {
    const
      supportedTransforms = /^((translate|rotate|scale)(X|Y|Z|3d)?|matrix(3d)?|perspective|skew(X|Y)?)$/i,
      vendors = {
        Webkit: 'webkit',
        Moz: '',
        O: 'o'
      },
      cssReset = {};
    let testEl = document.createElement('div'),
      eventPrefix,
      prefix = '';
    // 将驼峰字符串转成css属性，如marginLeft-->margin-left
    const cssDasherize = str => str.replace(/([A-Z])/g, '-$1').toLowerCase();
    /**
     * 根据浏览器内核，设置CSS前缀，事件前缀
     * 如-webkit， css：-webkit-  event:webkit
     * 这里会在vendors存储webkit，moz，o三种前缀
    */
    if (testEl.style.transform === undefined) {
      $.each(vendors, (vendor, event) => {
        if (testEl.style[`${vendor}TransitionProperty`] !== undefined) {
          // -webkit-
          prefix = `-${vendor.toLowerCase()}-`;
          eventPrefix = event;
          return false;
        }
      });
    }
    const normalizeEvent = name => eventPrefix ? `${eventPrefix}${name}` : name.toLowerCase();
    const transform = `${prefix}transform`;
    const transition = ('transition-property transition-duration transition-delay transition-timing-function animation-name animation-duration animation-delay animation-timing-function');
    transition.split(' ').forEach((prop) => {
      cssReset[`${prefix}${prop}`] = '';
    });
    $.fx = {
      off: eventPrefix === undefined && testEl.style.transitionProperty === undefined,
      speeds: {
        _default: 400,
        slow: 200,
        fast: 600
      },
      transitionEnd: normalizeEvent('TransitionEnd'),
      animationEnd: normalizeEvent('AnimationEnd')
    };
    $.fn.animate = function (properties, duration, ease, callback, delay) {
      if ($.isFunction(duration)) {
        callback = duration;
        duration = undefined;
        ease = undefined;
      }
      if ($.isFunction(ease)) {
        callback = ease;
        ease = undefined;
      }
      if ($.isPlainObject(duration)) {
        ease = duration.easing;
        callback = duration.complete;
        delay = duration.delay;
        duration = duration.duration;
      }
      if (duration) {
        duration = (typeof duration === 'number' ? duration :
          $.fx.speeds[duration] || $.fx.speeds._default) / 1000;
      }
      if (delay) {
        delay = parseFloat(delay) / 1000;
      }
      return this.anim(properties, duration, ease, callback, delay);
    };
    /**
     * 动画核心方法
     * @param properties  样式集
     * @param duration 持续事件
     * @param ease    速率
     * @param callback  完成时的回调
     * @param delay     动画延迟
     * @returns {*}
    */
    $.fn.anim = function (properties, duration, ease, callback, delay) {
      const cssValues = {};
      let endEvent = $.fx.transitionEnd,
        fired = false;
      if (duration === undefined) {
        duration = $.fx.speeds._default / 1000;
      }
      if (delay === undefined) {
        delay = 0;
      }
      if ($.fx.off) {
        duration = 0;
      }
      if (typeof properties === 'string') {
        cssValues['animation-name'] = properties;
        cssValues['animation-duration'] = `${duration}s`;
        cssValues['animation-delay'] = `${delay}s`;
        cssValues['animation-timing-function'] = (ease || 'linear');
        endEvent = $.fx.animationEnd;
      } else {
        const cssProperties = [];
        let tranforms = '';
        for (const key in properties) {
          if ({}.hasOwnProperty.call(properties, key)) {
            if (supportedTransforms.test(key)) {
              tranforms = `${tranforms}${key}(${properties[key]}) `;
            } else {
              cssValues[key] = properties[key];
              cssProperties.push(cssDasherize(key));
            }
          }
        }
        if (tranforms) {
          cssValues[transform] = tranforms;
          cssProperties.push(transform);
        }
        if (duration > 0 && typeof properties === 'object') {
          cssValues['transition-delay'] = `${delay}s`;
          cssValues['transition-property'] = cssProperties.join(', ');
          cssValues['transition-duration'] = `${duration}s`;
          cssValues['transition-timing-function'] = (ease || 'linear');
        }
      }
      // 在浏览器中完成动画之后会个transitionend(webkitTransitionEnd)
      // 有两个属性propertyName(字符串，指示已完成过渡的属性)
      // elapsedTime 浮点数，指示当触发这个事件时过渡已运行的时间（秒）。这个值不受 transition-delay 影响。
      // 照例可以用  element.addEventListener()
      const wrappedCallback = function (e) {
        if (e !== undefined) {
          if (e.target === e.currentTarget) {
            $(e.target).unbind(endEvent, wrappedCallback);
          } else {
            return;
          }
        } else {
          $(this).unbind(endEvent, wrappedCallback);
          fired = true;
          $(this).css(cssReset);
          if (callback) {
            callback.call(this);
          }
        }
      };
      if (duration > 0) {
        this.bind(endEvent, wrappedCallback);
        setTimeout(() => {
          console.log('1');
          if (fired) {
            return;
          }
          wrappedCallback.call(this.dom);
        }, ((duration + delay) * 1000) + 25);
      }
      // 主动触发页面回流，刷新DOM，让接下来设置的动画可以正确播放
      // 更改 offsetTop、offsetLeft、 offsetWidth、offsetHeight
      // scrollTop、scrollLeft、scrollWidth、scrollHeight
      // clientTop、clientLeft、clientWidth、clientHeight
      // getComputedStyle() 、currentStyle（）。这些都会触发回流
      // 回流导致DOM重新渲染，平时要尽可能避免，但这里，为了动画即时生效播放
      // 则主动触发回流，刷新DOM
      if (this.dom.length) {
        this.get(0).clientLeft;
      }
      this.css(cssValues);

      if (duration <= 0) {
        setTimeout(() => {
          this.dom.forEach((elem) => {
            wrappedCallback.call(elem);
          });
        });
      }
      return this;
    };
    testEl = null;
  })($);
  // touch
  (($) => {
    const longTapDelay = 750;
    let touch = {},
      gesture,
      _isPointerType,
      firstTouch,
      touchTimeout,
      longTapTimeout,
      swipeTimeout,
      tapTimeout;
    const swipeDirection = (x1, x2, y1, y2) => Math.abs(x1 - x2) >=
      Math.abs(y1 - y2) ? (x1 - x2 > 0 ? 'Left' : 'Right') :
      (y1 - y2 > 0 ? 'Top' : 'Down');
    const longTap = () => {
      longTapTimeout = null;
      if (touch.last) {
        touch.el.trigger('longTap');
        touch = {};
      }
    };
    const isPointerEventType = (e, eventType) => e.type === `pointer${eventType}` || e.type.toLowerCase() === `mspointer${eventType}`;

    const isPrimaryTouch = e => (e.pointerType === 'touch' ||
      e.pointerType === e.MSPOINTER_TYPE_TOUCH) && e.isPrimary;

    const cancelLongTap = () => {
      if (longTapTimeout) {
        clearTimeout(longTapTimeout);
      }
      longTapTimeout = null;
    };
    const cancelAll = () => {
      if (touchTimeout) {
        clearTimeout(touchTimeout);
      }
      if (longTapTimeout) {
        clearTimeout(longTapTimeout);
      }
      if (tapTimeout) {
        clearTimeout(tapTimeout);
      }
      if (swipeTimeout) {
        clearTimeout(swipeTimeout);
      }
      touchTimeout = tapTimeout = swipeTimeout = longTapTimeout = null;
      touch = {};
    };
    $(document).ready(() => {
      let deltaX = 0,
        deltaY = 0;
      // IE手势
      if ('MSGesture' in window) {
        gesture = new MSGesture();
        gesture.target = document.body;
      }

      $(document)
        .bind('MSGestureEnd', function (e) {
          // 处理IE手势结束
          const swipeDirectionFromVelocity = e.velocityX > 1 ? 'Right' :
            e.velocityX < -1 ? 'Left' : e.velocityY > 1 ? 'Down' :
            e.velocityY < -1 ? 'Up' : null;
          if (swipeDirectionFromVelocity) {
            touch.el.trigger('swipe');
            touch.el.trigger(`swipe${swipeDirectionFromVelocity}`);
          }
        });

      // 处理手指接触
      $(document)
        .on('touchstart MSPointerDown pointerdown', function (e) {
          // console.log(e);
          // 排除非触摸设备
          if ((_isPointerType = isPointerEventType(e, 'down')) && !isPrimaryTouch(e)) {
            return;
          }
          // TouchEvent获取起点位置对象[0]
          firstTouch = _isPointerType ? e : e.touches[0];
          if (e.touches && e.touches.length === 1 && touch.x2) {
            touch.x2 = undefined;
            touch.y2 = undefined;
          }
          const now = Date.now();
          // 距离上次碰触的时间差
          const delta = now - (touch.last || now);
          touch.el = $('tagName' in firstTouch.target ? firstTouch.target :
            firstTouch.target.parentNode);
          if (touchTimeout) {
            clearTimeout(touchTimeout);
          }
          // get the first touch  X axis and Y axis
          touch.x1 = firstTouch.pageX;
          touch.y1 = firstTouch.pageY;
          if (delta && delta <= 250) {
            touch.isDoubleTap = true;
          }
          touch.last = now;
          longTapTimeout = setTimeout(longTap, longTapDelay);
          if (gesture && _isPointerType) {
            gesture.addPointer(e.pointerId);
          }
        });

      $(document)
        .on('touchmove MSPointerMove pointermove', function (e) {
          // 排除非触摸设备
          if ((_isPointerType = isPointerEventType(e, 'move')) && !isPrimaryTouch(e)) {
            return;
          }
          firstTouch = _isPointerType ? e : e.touches[0];
          // 取消长按事件处理器
          cancelLongTap();
          touch.x2 = firstTouch.pageX;
          touch.y2 = firstTouch.pageY;
          // 累计滑过的距离
          deltaX += Math.abs(touch.x1 - touch.x2);
          deltaY += Math.abs(touch.y1 - touch.y2);
        });

      $(document)
        .on('touchend MSPointerUp pointerup', function (e) {
          if ((_isPointerType = isPointerEventType(e, 'up')) && !isPrimaryTouch(e)) {
            return;
          }
          cancelLongTap();
          // 判断是不是swip
          if ((touch.x2 && Math.abs(touch.x1 - touch.x2) > 30) ||
            (touch.y2 && Math.abs(touch.y1 - touch.y2) > 30)) {
            swipeTimeout = setTimeout(() => {
              if (touch.el) {
                touch.el.trigger('swip');
                touch.el.trigger(`swip${swipeDirection(touch.x1, touch.x2, touch.y1, touch.y2)}`);
              }
            }, 0);
          } else if ('last' in touch) {
            // 正常轻触
            // 如果从接触到抬起，中间滑过的横向和纵向距离都不超过30px
            if (deltaX < 30 && deltaY < 30) {
              tapTimeout = setTimeout(() => {
                const event = $.Event('tap');
                event.cancelTouch = cancelAll;
                if (touch.el) {
                  touch.el.trigger('tap');
                }
                if (touch.el && touch.isDoubleTap) {
                  touch.el.trigger('isDoubleTap');
                  touch = {};
                } else {
                  touchTimeout = setTimeout(() => {
                    touchTimeout = null;
                    if (touch.el) {
                      touch.el.trigger('singleTap');
                    }
                    touch = {};
                  }, 250);
                }
              }, 0);
            } else {
              touch = {};
            }
          }
          deltaX = deltaY = 0;
        });
      $(document).on('touchcancel MSPointerCancel pointercancel', cancelAll);
      $(window).on('scroll', cancelAll);
    });

    ['swipe', 'swipeLeft', 'swipeRight', 'swipeUp', 'swipeDown',
      'doubleTap', 'tap', 'singleTap', 'longTap'].forEach(function (eventName) {
        $.fn[eventName] = function (callback) {
          return this.on(eventName, callback);
        };
      });
  })($);
})(window);
