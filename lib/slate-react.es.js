import React from 'react';
import { IS_FIREFOX, IS_SAFARI, IS_IOS, IS_IE, IS_ANDROID, HAS_INPUT_EVENTS_LEVEL_2, IS_EDGE } from 'slate-dev-environment';
import { PathUtils, Block, Range, Text, Value, Node, Editor } from 'slate';
import getWindow from 'get-window';
import isBackward from 'selection-is-backward';
import Debug from 'debug';
import Types from 'prop-types';
import warning from 'tiny-warning';
import throttle from 'lodash/throttle';
import omit from 'lodash/omit';
import Hotkeys from 'slate-hotkeys';
import Base64 from 'slate-base64-serializer';
import Plain from 'slate-plain-serializer';
import invariant from 'tiny-invariant';
import PlaceholderPlugin from 'slate-react-placeholder';
import SlateTypes from 'slate-prop-types';
import memoizeOne from 'memoize-one';

/**
 * Event handlers used by Slate plugins.
 *
 * @type {Array}
 */

var EVENT_HANDLERS = ['onBeforeInput', 'onBlur', 'onClick', 'onContextMenu', 'onCompositionEnd', 'onCompositionUpdate', 'onCompositionStart', 'onCopy', 'onCut', 'onDragEnd', 'onDragEnter', 'onDragExit', 'onDragLeave', 'onDragOver', 'onDragStart', 'onDrop', 'onInput', 'onFocus', 'onKeyDown', 'onKeyUp', 'onMouseDown', 'onMouseUp', 'onPaste', 'onSelect'];

/**
 * Other handlers used by Slate plugins.
 *
 * @type {Array}
 */

var OTHER_HANDLERS = ['decorateNode', 'renderAnnotation', 'renderBlock', 'renderDecoration', 'renderDocument', 'renderEditor', 'renderInline', 'renderMark'];

/**
 * DOM data attribute strings that refer to Slate concepts.
 *
 * @type {String}
 */

var DATA_ATTRS = {
  EDITOR: 'data-slate-editor',
  FRAGMENT: 'data-slate-fragment',
  KEY: 'data-key',
  LEAF: 'data-slate-leaf',
  LENGTH: 'data-slate-length',
  OBJECT: 'data-slate-object',
  OFFSET_KEY: 'data-offset-key',
  SPACER: 'data-slate-spacer',
  STRING: 'data-slate-string',
  TEXT: 'data-slate-object',
  VOID: 'data-slate-void',
  ZERO_WIDTH: 'data-slate-zero-width'
};

/**
 * DOM selector strings that refer to Slate concepts.
 *
 * @type {String}
 */

var SELECTORS = {
  BLOCK: '[' + DATA_ATTRS.OBJECT + '="block"]',
  EDITOR: '[' + DATA_ATTRS.EDITOR + ']',
  INLINE: '[' + DATA_ATTRS.OBJECT + '="inline"]',
  KEY: '[' + DATA_ATTRS.KEY + ']',
  LEAF: '[' + DATA_ATTRS.LEAF + ']',
  OBJECT: '[' + DATA_ATTRS.OBJECT + ']',
  STRING: '[' + DATA_ATTRS.STRING + ']',
  TEXT: '[' + DATA_ATTRS.OBJECT + '="text"]',
  VOID: '[' + DATA_ATTRS.VOID + ']',
  ZERO_WIDTH: '[' + DATA_ATTRS.ZERO_WIDTH + ']'
};

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();





var defineProperty = function (obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
};

var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};



var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};











var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};





var slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();













var toConsumableArray = function (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  } else {
    return Array.from(arr);
  }
};

/**
 * Offset key parser regex.
 *
 * @type {RegExp}
 */

var PARSER = /^([\w-]+)(?::(\d+))?$/;

/**
 * Parse an offset key `string`.
 *
 * @param {String} string
 * @return {Object}
 */

function parse(string) {
  var matches = PARSER.exec(string);

  if (!matches) {
    throw new Error("Invalid offset key string \"" + string + "\".");
  }

  var _matches = slicedToArray(matches, 3),
      original = _matches[0],
      key = _matches[1],
      index = _matches[2]; // eslint-disable-line no-unused-vars


  return {
    key: key,
    index: parseInt(index, 10)
  };
}

/**
 * Stringify an offset key `object`.
 *
 * @param {Object} object
 *   @property {String} key
 *   @property {Number} index
 * @return {String}
 */

function stringify(object) {
  return object.key + ":" + object.index;
}

/**
 * Export.
 *
 * @type {Object}
 */

var OffsetKey = {
  parse: parse,
  stringify: stringify
};

var Leaf = function (_React$Component) {
  inherits(Leaf, _React$Component);

  function Leaf(props) {
    classCallCheck(this, Leaf);

    var _this = possibleConstructorReturn(this, (Leaf.__proto__ || Object.getPrototypeOf(Leaf)).call(this, props));

    _this.ref = React.createRef();
    // This component may have skipped rendering due to native operations being
    // applied. If an undo is performed React will see the old and new shadow DOM
    // match and not apply an update. Forces each render to actually reconcile.
    _this.forceUpdateFlag = false;
    return _this;
  }

  createClass(Leaf, [{
    key: 'shouldComponentUpdate',
    value: function shouldComponentUpdate(nextProps) {
      // If a native operation has made the text content the same as what
      // we are going to make it, skip. Maintains the native spell check handling.
      var isZeroWidth = nextProps.text === '';
      var domNode = this.ref.current;
      var domTextContent = domNode.textContent;
      var reactTextContent = isZeroWidth ? '\uFEFF' : nextProps.text;

      if (domTextContent !== reactTextContent) {
        return true;
      }

      var oldDecorations = this.props.decorations.map(function (d) {
        return d.type;
      }).join(' ');
      var newDecorations = nextProps.decorations.map(function (d) {
        return d.type;
      }).join(' ');

      if (oldDecorations !== newDecorations) {
        return true;
      }

      // If we should be a zero width node, but there is some text content in the dom, then allow react to clean it up
      if (isZeroWidth && domTextContent.replace(/[\uFEFF]/g, '') !== '') {
        return true;
      }

      var isOnly = nextProps.parent.nodes.size === 1 && nextProps.leaves.length === 1;
      var isLineBreak = false;
      var shouldHaveLineBreak = IS_FIREFOX && isLineBreak || !IS_FIREFOX && (isLineBreak || isOnly);

      // Otherwise, we shouldn't have to touch the text node at all, we might need to strip the zero-width attributes though!
      if (!isZeroWidth) {
        if (domNode.hasAttribute(DATA_ATTRS.ZERO_WIDTH)) {
          domNode.removeAttribute(DATA_ATTRS.ZERO_WIDTH);
        }

        if (domNode.hasAttribute(DATA_ATTRS.LENGTH)) {
          domNode.removeAttribute(DATA_ATTRS.LENGTH);
        }

        if (!domNode.hasAttribute(DATA_ATTRS.STRING)) {
          domNode.setAttribute(DATA_ATTRS.STRING, 'true');
        }
      } else {
        if (!domNode.hasAttribute(DATA_ATTRS.ZERO_WIDTH)) {
          domNode.setAttribute(DATA_ATTRS.ZERO_WIDTH, 'n');
        }

        if (!domNode.hasAttribute(DATA_ATTRS.LENGTH)) {
          domNode.setAttribute(DATA_ATTRS.LENGTH, '0');
        }

        if (domNode.hasAttribute(DATA_ATTRS.STRING)) {
          domNode.removeAttribute(DATA_ATTRS.STRING, 'true');
        }
      }

      if (!shouldHaveLineBreak) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = domNode.childNodes[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var child = _step.value;

            if (child.tagName === 'BR') {
              domNode.removeChild(child);
            }
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      } else {
        var hasLineBreak = false;

        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = domNode.childNodes[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var _child = _step2.value;

            if (_child.tagName === 'BR') {
              hasLineBreak = true;
              break;
            }
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }

        if (!hasLineBreak) {
          domNode.appendChild(window.document.createElement('br'));
        }
      }

      return false;
    }
  }, {
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.forceUpdateFlag = !this.forceUpdateFlag;
    }
  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate() {
      this.forceUpdateFlag = !this.forceUpdateFlag;
    }
  }, {
    key: 'render',
    value: function render() {
      var _attrs, _ref;

      var _props = this.props,
          decorations = _props.decorations,
          node = _props.node,
          index = _props.index,
          offset = _props.offset,
          text = _props.text,
          editor = _props.editor,
          parent = _props.parent,
          leaves = _props.leaves;


      var offsetKey = OffsetKey.stringify({
        key: node.key,
        index: index
      });
      var isOnly = parent.nodes.size === 1 && leaves.length === 1;
      var isLineBreak = false;
      var isZeroWidth = text === '';
      var shouldHaveLineBreak = IS_FIREFOX && isLineBreak || !IS_FIREFOX && (isLineBreak || isOnly);

      var attrs = (_attrs = {}, defineProperty(_attrs, DATA_ATTRS.LEAF, true), defineProperty(_attrs, DATA_ATTRS.OFFSET_KEY, offsetKey), defineProperty(_attrs, 'key', this.forceUpdateFlag ? 'A' : 'B'), _attrs);

      var children = isZeroWidth ? React.createElement(
        'span',
        _extends({
          ref: this.ref
        }, (_ref = {}, defineProperty(_ref, DATA_ATTRS.ZERO_WIDTH, isLineBreak ? 'n' : 'z'), defineProperty(_ref, DATA_ATTRS.LENGTH, 0), _ref)),
        '\uFEFF',
        shouldHaveLineBreak ? React.createElement('br', null) : null
      ) : React.createElement(
        'span',
        _extends({
          ref: this.ref
        }, defineProperty({}, DATA_ATTRS.STRING, true)),
        text,
        shouldHaveLineBreak ? React.createElement('br', null) : null
      );

      if (text !== '') {
        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
          for (var _iterator3 = decorations[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var decoration = _step3.value;

            var ret = editor.run('renderDecoration', {
              editor: editor,
              decorations: decorations,
              node: node,
              offset: offset,
              text: text,
              decoration: decoration,
              children: children,
              attributes: defineProperty({}, DATA_ATTRS.OBJECT, 'decoration')
            });

            if (ret) {
              children = ret;
            }
          }
        } catch (err) {
          _didIteratorError3 = true;
          _iteratorError3 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion3 && _iterator3.return) {
              _iterator3.return();
            }
          } finally {
            if (_didIteratorError3) {
              throw _iteratorError3;
            }
          }
        }
      }
      return React.createElement(
        'span',
        attrs,
        children
      );
    }
  }]);
  return Leaf;
}(React.Component);

/**
 * Text node.
 *
 * @type {Component}
 */

var Text$1 = React.forwardRef(function (props, ref) {
  var _ref;

  var decorations = props.decorations,
      node = props.node,
      parent = props.parent,
      editor = props.editor,
      style = props.style;
  var key = node.key;

  var leaves = node.getLeaves(decorations);
  var at = 0;

  return React.createElement(
    'span',
    _extends({
      ref: ref,
      style: style
    }, (_ref = {}, defineProperty(_ref, DATA_ATTRS.OBJECT, node.object), defineProperty(_ref, DATA_ATTRS.KEY, key), _ref)),
    leaves.map(function (leaf, index) {
      var text = leaf.text;

      var offset = at;
      at += text.length;

      return React.createElement(Leaf, {
        key: node.key + '-' + index,
        block: parent,
        editor: editor,
        index: index,
        decorations: leaf.decorations,
        node: node,
        offset: offset,
        parent: parent,
        leaves: leaves,
        text: text
      });
    })
  );
});

var Inline = function (_React$Component) {
  inherits(Inline, _React$Component);

  function Inline() {
    var _ref;

    var _temp, _this, _ret;

    classCallCheck(this, Inline);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = possibleConstructorReturn(this, (_ref = Inline.__proto__ || Object.getPrototypeOf(Inline)).call.apply(_ref, [this].concat(args))), _this), _this.tmp = { nodeRefs: {} }, _this.ref = React.createRef(), _temp), possibleConstructorReturn(_this, _ret);
  }

  createClass(Inline, [{
    key: 'shouldComponentUpdate',
    value: function shouldComponentUpdate(nextProps) {
      return this.props.node !== nextProps.node;
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this,
          _attributes;

      var _props = this.props,
          editor = _props.editor,
          node = _props.node,
          parent = _props.parent;


      var decorations = node.getDecorations(editor);
      var children = [];

      if (node.nodes.size > 1 || node.nodes.size === 1 && node.nodes.first().text !== ' ') {
        var _loop = function _loop(child) {
          var i = children.length;

          var refFn = function refFn(ref) {
            if (ref) {
              _this2.tmp.nodeRefs[i] = ref;
            } else {
              delete _this2.tmp.nodeRefs[i];
            }
          };

          if (child.object === 'inline') {
            children.push(React.createElement(Inline, {
              ref: refFn,
              key: child.key,
              editor: editor,
              node: child,
              parent: node
            }));
          } else {
            var decs = decorations.map(function (d) {
              return getRelativeRange(node, i, d);
            }).filter(function (d) {
              return d;
            });

            children.push(React.createElement(Text$1, {
              ref: refFn,
              key: child.key,
              editor: editor,
              node: child,
              parent: node,
              decorations: decs
            }));
          }
        };

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = node.nodes[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var child = _step.value;

            _loop(child);
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      }

      // Attributes that the developer must mix into the element in their
      // custom node renderer component.
      var attributes = (_attributes = {}, defineProperty(_attributes, DATA_ATTRS.OBJECT, node.object), defineProperty(_attributes, DATA_ATTRS.KEY, node.key), defineProperty(_attributes, 'ref', this.ref), _attributes);

      return editor.run('renderInline', {
        attributes: attributes,
        children: children,
        editor: editor,
        node: node,
        parent: parent
      });
    }
  }]);
  return Inline;
}(React.Component);

var Block$1 = function (_React$Component) {
  inherits(Block$$1, _React$Component);

  function Block$$1() {
    var _ref;

    var _temp, _this, _ret;

    classCallCheck(this, Block$$1);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = possibleConstructorReturn(this, (_ref = Block$$1.__proto__ || Object.getPrototypeOf(Block$$1)).call.apply(_ref, [this].concat(args))), _this), _this.tmp = { nodeRefs: {} }, _this.ref = React.createRef(), _temp), possibleConstructorReturn(_this, _ret);
  }

  createClass(Block$$1, [{
    key: 'shouldComponentUpdate',
    value: function shouldComponentUpdate(nextProps) {
      return this.props.node !== nextProps.node;
    }
  }, {
    key: 'render',
    value: function render() {
      var _attributes,
          _this2 = this;

      var _props = this.props,
          editor = _props.editor,
          node = _props.node,
          parent = _props.parent;


      var decorations = node.getDecorations(editor);
      var children = [];

      var _loop = function _loop(child) {
        var i = children.length;

        var refFn = function refFn(ref) {
          if (ref) {
            _this2.tmp.nodeRefs[i] = ref;
          } else {
            delete _this2.tmp.nodeRefs[i];
          }
        };

        if (child.object === 'block') {
          children.push(React.createElement(Block$$1, {
            ref: refFn,
            key: child.key,
            editor: editor,
            node: child,
            parent: node
          }));
        } else if (child.object === 'inline') {
          children.push(React.createElement(Inline, {
            ref: refFn,
            key: child.key,
            editor: editor,
            node: child,
            parent: node
          }));
        } else {
          var decs = decorations.map(function (d) {
            return getRelativeRange(node, i, d);
          }).filter(function (d) {
            return d;
          });

          children.push(React.createElement(Text$1, {
            ref: refFn,
            key: child.key,
            editor: editor,
            node: child,
            parent: node,
            decorations: decs
          }));
        }
      };

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = node.nodes[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var child = _step.value;

          _loop(child);
        }

        // Attributes that the developer must mix into the element in their
        // custom node renderer component.
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      var attributes = (_attributes = {}, defineProperty(_attributes, DATA_ATTRS.OBJECT, node.object), defineProperty(_attributes, DATA_ATTRS.KEY, node.key), defineProperty(_attributes, 'ref', this.ref), _attributes);

      // If it's a block node with inline children, add the proper `dir` attribute
      // for text direction.
      if (node.isLeafBlock()) {
        var direction = node.getTextDirection();
        if (direction === 'rtl') attributes.dir = 'rtl';
      }

      return editor.run('renderBlock', {
        attributes: attributes,
        children: children,
        editor: editor,
        node: node,
        parent: parent
      });
    }
  }]);
  return Block$$1;
}(React.Component);

function getRelativeRange(node, index, range) {
  if (range.isUnset) {
    return null;
  }

  var child = node.nodes.get(index);
  var _range = range,
      start = _range.start,
      end = _range.end;
  var _start = start,
      startPath = _start.path;
  var _end = end,
      endPath = _end.path;

  var startIndex = startPath.first();
  var endIndex = endPath.first();

  if (startIndex === index) {
    start = start.setPath(startPath.rest());
  } else if (startIndex < index && index <= endIndex) {
    if (child.object === 'text') {
      start = start.moveTo(PathUtils.create([index]), 0).setKey(child.key);
    } else {
      var _child$texts = child.texts(),
          _child$texts2 = slicedToArray(_child$texts, 1),
          first = _child$texts2[0];

      var _first = slicedToArray(first, 2),
          firstNode = _first[0],
          firstPath = _first[1];

      start = start.moveTo(firstPath, 0).setKey(firstNode.key);
    }
  } else {
    start = null;
  }

  if (endIndex === index) {
    end = end.setPath(endPath.rest());
  } else if (startIndex <= index && index < endIndex) {
    if (child.object === 'text') {
      var length = child.text.length;
      end = end.moveTo(PathUtils.create([index]), length).setKey(child.key);
    } else {
      var _child$texts3 = child.texts({ direction: 'backward' }),
          _child$texts4 = slicedToArray(_child$texts3, 1),
          last = _child$texts4[0];

      var _last = slicedToArray(last, 2),
          lastNode = _last[0],
          lastPath = _last[1];

      end = end.moveTo(lastPath, lastNode.text.length).setKey(lastNode.key);
    }
  } else {
    end = null;
  }

  if (!start || !end) {
    return null;
  }

  range = range.setAnchor(start);
  range = range.setFocus(end);
  return range;
}

var Document = function (_React$Component) {
  inherits(Document, _React$Component);

  function Document() {
    var _ref;

    var _temp, _this, _ret;

    classCallCheck(this, Document);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = possibleConstructorReturn(this, (_ref = Document.__proto__ || Object.getPrototypeOf(Document)).call.apply(_ref, [this].concat(args))), _this), _this.tmp = { nodeRefs: {} }, _temp), possibleConstructorReturn(_this, _ret);
  }

  createClass(Document, [{
    key: 'shouldComponentUpdate',
    value: function shouldComponentUpdate(nextProps) {
      return this.props.node !== nextProps.node;
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var _props = this.props,
          editor = _props.editor,
          node = _props.node;


      var children = [];

      var _loop = function _loop(child) {
        var Component = child.object === 'text' ? Text$1 : child.object === 'block' ? Block$1 : Inline;
        var i = children.length;

        children.push(React.createElement(Component, {
          key: child.key,
          editor: editor,
          node: child,
          parent: node
          // COMPAT: We use this map of refs to lookup a DOM node down the
          // tree of components by path.
          , ref: function ref(_ref2) {
            if (_ref2) {
              _this2.tmp.nodeRefs[i] = _ref2;
            } else {
              delete _this2.tmp.nodeRefs[i];
            }
          }
        }));
      };

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = node.nodes[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var child = _step.value;

          _loop(child);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      return children;
    }
  }]);
  return Document;
}(React.Component);

/**
 * CSS overflow values that would cause scrolling.
 *
 * @type {Array}
 */

var OVERFLOWS = ['auto', 'overlay', 'scroll'];

/**
 * Detect whether we are running IOS version 11
 */

var IS_IOS_11 = IS_IOS && !!window.navigator.userAgent.match(/os 11_/i);

/**
 * Find the nearest parent with scrolling, or window.
 *
 * @param {el} Element
 */

function findScrollContainer(el, window) {
  var parent = el.parentNode;
  var scroller = void 0;

  while (!scroller) {
    if (!parent.parentNode) break;

    var style = window.getComputedStyle(parent);
    var overflowY = style.overflowY;


    if (OVERFLOWS.includes(overflowY)) {
      scroller = parent;
      break;
    }

    parent = parent.parentNode;
  }

  // COMPAT: Because Chrome does not allow doucment.body.scrollTop, we're
  // assuming that window.scrollTo() should be used if the scrollable element
  // turns out to be document.body or document.documentElement. This will work
  // unless body is intentionally set to scrollable by restricting its height
  // (e.g. height: 100vh).
  if (!scroller) {
    return window.document.body;
  }

  return scroller;
}

/**
 * Scroll the current selection's focus point into view if needed.
 *
 * @param {Selection} selection
 */

function scrollToSelection(selection) {
  if (IS_IOS_11) return;
  if (!selection.anchorNode) return;

  var window = getWindow(selection.anchorNode);
  var scroller = findScrollContainer(selection.anchorNode, window);
  var isWindow = scroller === window.document.body || scroller === window.document.documentElement;
  var backward = isBackward(selection);

  var range = selection.getRangeAt(0).cloneRange();
  range.collapse(backward);
  var cursorRect = range.getBoundingClientRect();

  // COMPAT: range.getBoundingClientRect() returns 0s in Safari when range is
  // collapsed. Expanding the range by 1 is a relatively effective workaround
  // for vertical scroll, although horizontal may be off by 1 character.
  // https://bugs.webkit.org/show_bug.cgi?id=138949
  // https://bugs.chromium.org/p/chromium/issues/detail?id=435438
  if (IS_SAFARI) {
    if (range.collapsed && cursorRect.top === 0 && cursorRect.height === 0) {
      if (range.startOffset === 0) {
        range.setEnd(range.endContainer, 1);
      } else {
        range.setStart(range.startContainer, range.startOffset - 1);
      }

      cursorRect = range.getBoundingClientRect();

      if (cursorRect.top === 0 && cursorRect.height === 0) {
        if (range.getClientRects().length) {
          cursorRect = range.getClientRects()[0];
        }
      }
    }
  }

  var width = void 0;
  var height = void 0;
  var yOffset = void 0;
  var xOffset = void 0;
  var scrollerTop = 0;
  var scrollerLeft = 0;
  var scrollerBordersY = 0;
  var scrollerBordersX = 0;
  var scrollerPaddingTop = 0;
  var scrollerPaddingBottom = 0;
  var scrollerPaddingLeft = 0;
  var scrollerPaddingRight = 0;

  if (isWindow) {
    var innerWidth = window.innerWidth,
        innerHeight = window.innerHeight,
        pageYOffset = window.pageYOffset,
        pageXOffset = window.pageXOffset;

    width = innerWidth;
    height = innerHeight;
    yOffset = pageYOffset;
    xOffset = pageXOffset;
  } else {
    var offsetWidth = scroller.offsetWidth,
        offsetHeight = scroller.offsetHeight,
        scrollTop = scroller.scrollTop,
        scrollLeft = scroller.scrollLeft;

    var _window$getComputedSt = window.getComputedStyle(scroller),
        borderTopWidth = _window$getComputedSt.borderTopWidth,
        borderBottomWidth = _window$getComputedSt.borderBottomWidth,
        borderLeftWidth = _window$getComputedSt.borderLeftWidth,
        borderRightWidth = _window$getComputedSt.borderRightWidth,
        paddingTop = _window$getComputedSt.paddingTop,
        paddingBottom = _window$getComputedSt.paddingBottom,
        paddingLeft = _window$getComputedSt.paddingLeft,
        paddingRight = _window$getComputedSt.paddingRight;

    var scrollerRect = scroller.getBoundingClientRect();
    width = offsetWidth;
    height = offsetHeight;
    scrollerTop = scrollerRect.top + parseInt(borderTopWidth, 10);
    scrollerLeft = scrollerRect.left + parseInt(borderLeftWidth, 10);

    scrollerBordersY = parseInt(borderTopWidth, 10) + parseInt(borderBottomWidth, 10);

    scrollerBordersX = parseInt(borderLeftWidth, 10) + parseInt(borderRightWidth, 10);

    scrollerPaddingTop = parseInt(paddingTop, 10);
    scrollerPaddingBottom = parseInt(paddingBottom, 10);
    scrollerPaddingLeft = parseInt(paddingLeft, 10);
    scrollerPaddingRight = parseInt(paddingRight, 10);
    yOffset = scrollTop;
    xOffset = scrollLeft;
  }

  var cursorTop = cursorRect.top + yOffset - scrollerTop;
  var cursorLeft = cursorRect.left + xOffset - scrollerLeft;

  var x = xOffset;
  var y = yOffset;

  if (cursorLeft < xOffset) {
    // selection to the left of viewport
    x = cursorLeft - scrollerPaddingLeft;
  } else if (cursorLeft + cursorRect.width + scrollerBordersX > xOffset + width) {
    // selection to the right of viewport
    x = cursorLeft + scrollerBordersX + scrollerPaddingRight - width;
  }

  if (cursorTop < yOffset) {
    // selection above viewport
    y = cursorTop - scrollerPaddingTop;
  } else if (cursorTop + cursorRect.height + scrollerBordersY > yOffset + height) {
    // selection below viewport
    y = cursorTop + scrollerBordersY + scrollerPaddingBottom + cursorRect.height - height;
  }

  if (isWindow) {
    window.scrollTo(x, y);
  } else {
    scroller.scrollTop = y;
    scroller.scrollLeft = x;
  }
}

/**
 * Cross-browser remove all ranges from a `domSelection`.
 *
 * @param {Selection} domSelection
 */

function removeAllRanges(domSelection) {
  // COMPAT: In IE 11, if the selection contains nested tables, then
  // `removeAllRanges` will throw an error.
  if (IS_IE) {
    var range = window.document.body.createTextRange();
    range.collapse();
    range.select();
  } else {
    domSelection.removeAllRanges();
  }
}

var FIREFOX_NODE_TYPE_ACCESS_ERROR = /Permission denied to access property "nodeType"/;

/**
 * Debug.
 *
 * @type {Function}
 */

var debug = Debug('slate:content');

/**
 * Separate debug to easily see when the DOM has updated either by render or
 * changing selection.
 *
 * @type {Function}
 */

debug.update = Debug('slate:update');

/**
 * Content.
 *
 * @type {Component}
 */

var Content = function (_React$Component) {
  inherits(Content, _React$Component);

  function Content() {
    var _ref;

    var _temp, _this, _ret;

    classCallCheck(this, Content);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = possibleConstructorReturn(this, (_ref = Content.__proto__ || Object.getPrototypeOf(Content)).call.apply(_ref, [this].concat(args))), _this), _this.tmp = {
      isUpdatingSelection: false,
      nodeRef: React.createRef(),
      nodeRefs: {},
      contentKey: 0,
      nativeSelection: {} // Native selection object stored to check if `onNativeSelectionChange` has triggered yet


      /**
       * A ref for the contenteditable DOM node.
       *
       * @type {Object}
       */

    }, _this.ref = React.createRef(), _this.setRef = function (el) {
      _this.ref.current = el;
      _this.props.editor.el = el;

      if (_this.props.domRef) {
        _this.props.domRef(el);
      }

      if (el) {
        _this.props.editor.ownerWindow = getWindow(el);
      }
    }, _this.handlers = EVENT_HANDLERS.reduce(function (obj, handler) {
      obj[handler] = function (event) {
        return _this.onEvent(handler, event);
      };
      return obj;
    }, {}), _this.updateSelection = function () {
      if (!_this.ref.current) return;
      var editor = _this.props.editor;

      // While the editor is handling a composition (like for Asian input), we allow the browser to modify the DOM
      // and we avoid modifying slate's internal representation of the document until the composition is over.
      // Because of this the user might have typed a character at position 4, but slate thinks there is only
      // 3 characters in the node!  So, the work around is to skip syncing slate's view of the selection to the DOM
      // until the composition is over.

      if (editor.isComposing() && HAS_INPUT_EVENTS_LEVEL_2) return;

      var value = editor.value;
      var selection = value.selection;
      var isBackward$$1 = selection.isBackward;

      var native = editor.ownerWindow.getSelection();
      var activeElement = editor.ownerWindow.document.activeElement;


      if (debug.update.enabled) {
        debug.update('updateSelection', { selection: selection.toJSON() });
      }

      // COMPAT: In Firefox, there's a but where `getSelection` can return `null`.
      // https://bugzilla.mozilla.org/show_bug.cgi?id=827585 (2018/11/07)
      if (!native) {
        return;
      }

      var rangeCount = native.rangeCount,
          anchorNode = native.anchorNode;

      var updated = false;

      // If the Slate selection is blurred, but the DOM's active element is still
      // the editor, we need to blur it.
      if (selection.isBlurred && activeElement === _this.ref.current) {
        _this.ref.current.blur();
        updated = true;
      }

      // If the Slate selection is unset, but the DOM selection has a range
      // selected in the editor, we need to remove the range.
      // However we should _not_ remove the range if the selection as
      // reported by `getSelection` is not equal to `this.tmp.nativeSelection`
      // as this suggests `onNativeSelectionChange` has not triggered yet (which can occur in Firefox)
      // See: https://github.com/ianstormtaylor/slate/pull/2995

      var propsToCompare = ['anchorNode', 'anchorOffset', 'focusNode', 'focusOffset', 'isCollapsed', 'rangeCount', 'type'];

      var selectionsEqual = true;

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = propsToCompare[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var prop = _step.value;

          if (_this.tmp.nativeSelection[prop] !== native[prop]) {
            selectionsEqual = false;
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      if (selection.isUnset && rangeCount && _this.isInEditor(anchorNode) && selectionsEqual) {
        removeAllRanges(native);
        updated = true;
      }

      // If the Slate selection is focused, but the DOM's active element is not
      // the editor, we need to focus it. We prevent scrolling because we handle
      // scrolling to the correct selection.
      if (selection.isFocused && activeElement !== _this.ref.current) {
        _this.ref.current.focus({ preventScroll: true });
        updated = true;
      }

      // Otherwise, figure out which DOM nodes should be selected...
      if (selection.isFocused && selection.isSet) {
        var current = !!native.rangeCount && native.getRangeAt(0);
        var range = safelyFindDOMRange(editor, selection);

        if (!range) {
          warning(false, 'Unable to find a native DOM range from the current selection.');

          return;
        }

        var startContainer = range.startContainer,
            startOffset = range.startOffset,
            endContainer = range.endContainer,
            endOffset = range.endOffset;

        // If the new range matches the current selection, there is nothing to fix.
        // COMPAT: The native `Range` object always has it's "start" first and "end"
        // last in the DOM. It has no concept of "backwards/forwards", so we have
        // to check both orientations here. (2017/10/31)

        if (current) {
          if (startContainer === current.startContainer && startOffset === current.startOffset && endContainer === current.endContainer && endOffset === current.endOffset || startContainer === current.endContainer && startOffset === current.endOffset && endContainer === current.startContainer && endOffset === current.startOffset) {
            return;
          }
        }

        // Otherwise, set the `isUpdatingSelection` flag and update the selection.
        updated = true;
        _this.tmp.isUpdatingSelection = true;
        removeAllRanges(native);

        // COMPAT: IE 11 does not support `setBaseAndExtent`. (2018/11/07)
        if (native.setBaseAndExtent) {
          // COMPAT: Since the DOM range has no concept of backwards/forwards
          // we need to check and do the right thing here.
          if (isBackward$$1) {
            native.setBaseAndExtent(range.endContainer, range.endOffset, range.startContainer, range.startOffset);
          } else {
            native.setBaseAndExtent(range.startContainer, range.startOffset, range.endContainer, range.endOffset);
          }
        } else {
          native.addRange(range);
        }

        // Only scroll to selection when a user action is performed
        if (editor.userActionPerformed() === true) {
          // Scroll to the selection, in case it's out of view.
          scrollToSelection(native);
        }

        // Then unset the `isUpdatingSelection` flag after a delay, to ensure that
        // it is still set when selection-related events from updating it fire.
        setTimeout(function () {
          // COMPAT: In Firefox, it's not enough to create a range, you also need
          // to focus the contenteditable element too. (2016/11/16)
          if (IS_FIREFOX && _this.ref.current) {
            _this.ref.current.focus();
          }

          _this.tmp.isUpdatingSelection = false;

          debug.update('updateSelection:setTimeout', {
            anchorOffset: editor.ownerWindow.getSelection().anchorOffset
          });
        });
      }

      if (updated && (debug.enabled || debug.update.enabled)) {
        debug('updateSelection', { selection: selection, native: native, activeElement: activeElement });

        debug.update('updateSelection:applied', {
          selection: selection.toJSON(),
          native: {
            anchorOffset: native.anchorOffset,
            focusOffset: native.focusOffset
          }
        });
      }
    }, _this.isInEditor = function (target) {
      var el = void 0;

      try {
        // COMPAT: In Firefox, sometimes the node can be comment which doesn't
        // have .closest and it crashes.
        if (target.nodeType === 8) {
          return false;
        }

        // COMPAT: Text nodes don't have `isContentEditable` property. So, when
        // `target` is a text node use its parent node for check.
        el = target.nodeType === 3 ? target.parentNode : target;
      } catch (err) {
        // COMPAT: In Firefox, `target.nodeType` will throw an error if target is
        // originating from an internal "restricted" element (e.g. a stepper
        // arrow on a number input)
        // see github.com/ianstormtaylor/slate/issues/1819
        if (IS_FIREFOX && FIREFOX_NODE_TYPE_ACCESS_ERROR.test(err.message)) {
          return false;
        }

        throw err;
      }

      return el.isContentEditable && (el === _this.ref.current || el.closest(SELECTORS.EDITOR) === _this.ref.current);
    }, _this.onNativeSelectionChange = throttle(function (event) {
      if (_this.props.readOnly) return;

      var editor = _this.props.editor;
      var activeElement = editor.ownerWindow.document.activeElement;

      var native = editor.ownerWindow.getSelection();

      debug.update('onNativeSelectionChange', {
        anchorOffset: native.anchorOffset
      });

      if (activeElement !== _this.ref.current) return;

      _this.tmp.nativeSelection = {
        anchorNode: native.anchorNode,
        anchorOffset: native.anchorOffset,
        focusNode: native.focusNode,
        focusOffset: native.focusOffset,
        isCollapsed: native.isCollapsed,
        rangeCount: native.rangeCount,
        type: native.type
      };

      _this.props.onEvent('onSelect', event);
    }, 100), _temp), possibleConstructorReturn(_this, _ret);
  }
  /**
   * Property types.
   *
   * @type {Object}
   */

  /**
   * Default properties.
   *
   * @type {Object}
   */

  createClass(Content, [{
    key: 'componentDidCatch',


    /**
     * An error boundary. If there is a render error, we increment `errorKey`
     * which is part of the container `key` which forces a re-render from
     * scratch.
     *
     * @param {Error} error
     * @param {String} info
     */

    value: function componentDidCatch(error, info) {
      console.error('!!  COMPONENT DID CATCH');
      console.error(error);
      console.error(info);
      debug('componentDidCatch', { error: error, info: info });
      // The call to `setState` is required despite not setting a value.
      // Without this call, React will not try to recreate the component tree.
      this.setState({});
    }

    /**
     * Temporary values.
     *
     * @type {Object}
     */

    /**
     * Set `this.ref`, `editor.el`, and `editor.ownerWindow`
     *
     * @type {DOMElement}
     */

    /**
     * Create a set of bound event handlers.
     *
     * @type {Object}
     */

  }, {
    key: 'componentDidMount',


    /**
     * When the editor first mounts in the DOM we need to:
     *
     *   - Add native DOM event listeners.
     *   - Update the selection, in case it starts focused.
     */

    value: function componentDidMount() {
      var editor = this.props.editor;


      editor.ownerWindow.document.addEventListener('selectionchange', this.onNativeSelectionChange);

      // COMPAT: Restrict scope of `beforeinput` to clients that support the
      // Input Events Level 2 spec, since they are preventable events.
      if (HAS_INPUT_EVENTS_LEVEL_2 && this.ref.current) {
        this.ref.current.addEventListener('beforeinput', this.handlers.onBeforeInput);
      }

      this.updateSelection();

      this.props.onEvent('onComponentDidMount');
    }

    /**
     * When unmounting, remove DOM event listeners.
     */

  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      var editor = this.props.editor;


      if (editor.ownerWindow) {
        editor.ownerWindow.document.removeEventListener('selectionchange', this.onNativeSelectionChange);
      }

      if (HAS_INPUT_EVENTS_LEVEL_2) {
        this.ref.current.removeEventListener('beforeinput', this.handlers.onBeforeInput);
      }

      this.props.onEvent('onComponentWillUnmount');
    }

    /**
     * On update, update the selection.
     */

  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate() {
      debug.update('componentDidUpdate');

      this.updateSelection();
      this.props.editor.clearUserActionPerformed();

      this.props.onEvent('onComponentDidUpdate');
    }

    /**
     * Update the native DOM selection to reflect the internal model.
     */

    /**
     * Check if an event `target` is fired from within the contenteditable
     * element. This should be false for edits happening in non-contenteditable
     * children, such as void nodes and other nested Slate editors.
     *
     * @param {Element} target
     * @return {Boolean}
     */

  }, {
    key: 'onEvent',


    /**
     * On `event` with `handler`.
     *
     * @param {String} handler
     * @param {Event} event
     */

    value: function onEvent(handler, event) {
      debug('onEvent', handler);

      var nativeEvent = event.nativeEvent || event;
      var isUndoRedo = event.type === 'keydown' && (Hotkeys.isUndo(nativeEvent) || Hotkeys.isRedo(nativeEvent));

      // Ignore `onBlur`, `onFocus` and `onSelect` events generated
      // programmatically while updating selection.
      if ((this.tmp.isUpdatingSelection || isUndoRedo) && (handler === 'onSelect' || handler === 'onBlur' || handler === 'onFocus')) {
        return;
      }

      // COMPAT: There are situations where a select event will fire with a new
      // native selection that resolves to the same internal position. In those
      // cases we don't need to trigger any changes, since our internal model is
      // already up to date, but we do want to update the native selection again
      // to make sure it is in sync. (2017/10/16)
      //
      // ANDROID: The updateSelection causes issues in Android when you are
      // at the end of a block. The selection ends up to the left of the inserted
      // character instead of to the right. This behavior continues even if
      // you enter more than one character. (2019/01/03)
      if (!IS_ANDROID && handler === 'onSelect') {
        var editor = this.props.editor;
        var value = editor.value;
        var selection = value.selection;

        var domSelection = editor.ownerWindow.getSelection();
        var range = editor.findRange(domSelection);

        if (range && range.equals(selection.toRange())) {
          this.updateSelection();
          return;
        }
      }

      // Don't handle drag and drop events coming from embedded editors.
      if (handler === 'onDragEnd' || handler === 'onDragEnter' || handler === 'onDragExit' || handler === 'onDragLeave' || handler === 'onDragOver' || handler === 'onDragStart' || handler === 'onDrop') {
        var closest = event.target.closest(SELECTORS.EDITOR);

        if (closest !== this.ref.current) {
          return;
        }
      }

      // Some events require being in editable in the editor, so if the event
      // target isn't, ignore them.
      if (handler === 'onBeforeInput' || handler === 'onBlur' || handler === 'onCompositionEnd' || handler === 'onCompositionUpdate' || handler === 'onCompositionStart' || handler === 'onCopy' || handler === 'onCut' || handler === 'onFocus' || handler === 'onInput' || handler === 'onKeyDown' || handler === 'onKeyUp' || handler === 'onPaste' || handler === 'onSelect') {
        if (!this.isInEditor(event.target)) {
          return;
        }
      }

      this.props.onEvent(handler, event);
    }

    /**
     * On native `selectionchange` event, trigger the `onSelect` handler. This is
     * needed to account for React's `onSelect` being non-standard and not firing
     * until after a selection has been released. This causes issues in situations
     * where another change happens while a selection is being made.
     *
     * @param {Event} event
     */

  }, {
    key: 'render',


    /**
     * Render the editor content.
     *
     * @return {Element}
     */

    value: function render() {
      var _data;

      var props = this.props,
          handlers = this.handlers;
      var id = props.id,
          className = props.className,
          readOnly = props.readOnly,
          editor = props.editor,
          tabIndex = props.tabIndex,
          role = props.role,
          tagName = props.tagName,
          spellCheck = props.spellCheck,
          onContextMenu = props.onContextMenu;
      var value = editor.value;

      var Container = tagName;
      var document = value.document;


      var style = _extends({
        // Prevent the default outline styles.
        outline: 'none',
        // Preserve adjacent whitespace and new lines.
        whiteSpace: 'pre-wrap',
        // Allow words to break if they are too long.
        wordWrap: 'break-word'
      }, readOnly ? {} : { WebkitUserModify: 'read-write-plaintext-only' }, props.style);

      // console.log('rerender content', this.tmp.contentKey, document.text)

      debug('render', { props: props });
      debug.update('render', this.tmp.contentKey, document.text);

      this.props.onEvent('onRender');

      var data = (_data = {}, defineProperty(_data, DATA_ATTRS.EDITOR, true), defineProperty(_data, DATA_ATTRS.KEY, document.key), _data);

      var domProps = omit(this.props, Object.keys(Content.__propTypes));

      return React.createElement(
        Container,
        _extends({}, domProps, {
          key: this.tmp.contentKey
        }, handlers, data, {
          ref: this.setRef,
          contentEditable: readOnly ? null : true,
          suppressContentEditableWarning: true,
          id: id,
          className: className,
          autoCorrect: props.autoCorrect ? 'on' : 'off',
          spellCheck: spellCheck,
          style: style,
          role: readOnly ? null : role || 'textbox',
          tabIndex: tabIndex,
          onContextMenu: onContextMenu
          // COMPAT: The Grammarly Chrome extension works by changing the DOM out
          // from under `contenteditable` elements, which leads to weird behaviors
          // so we have to disable it like this. (2017/04/24)

          // just the existence of the flag is disabling the extension irrespective of its value
          , 'data-gramm': domProps['data-gramm'] ? undefined : false
        }),
        React.createElement(Document, { editor: editor, node: document, ref: this.tmp.nodeRef })
      );
    }
  }]);
  return Content;
}(React.Component);

Content.__propTypes = {
  autoCorrect: Types.bool.isRequired,
  className: Types.string,
  contentKey: Types.number,
  editor: Types.object.isRequired,
  id: Types.string,
  onContextMenu: Types.func,
  onEvent: Types.func.isRequired,
  domRef: Types.func,
  readOnly: Types.bool.isRequired,
  role: Types.string,
  spellCheck: Types.bool.isRequired,
  style: Types.object,
  tabIndex: Types.number,
  tagName: Types.string };
Content.defaultProps = {
  style: {},
  tagName: 'div' };


function safelyFindDOMRange(editor, selection) {
  try {
    return editor.findDOMRange(selection);
  } catch (e) {
    console.error(e);
  }
}

/**
 * Props that can be defined by plugins.
 *
 * @type {Array}
 */

var PROPS = [].concat(toConsumableArray(EVENT_HANDLERS), ['commands', 'decorateNode', 'queries', 'renderAnnotation', 'renderBlock', 'renderDecoration', 'renderDocument', 'renderEditor', 'renderInline', 'renderMark', 'schema']);

/**
 * The top-level editor props in a plugin.
 *
 * @param {Object} options
 * @return {Object}
 */

function EditorPropsPlugin() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var plugin = PROPS.reduce(function (memo, prop) {
    if (prop in options) memo[prop] = options[prop];
    return memo;
  }, {});

  return plugin;
}

/**
 * The default rendering behavior for the React plugin.
 *
 * @return {Object}
 */

function Rendering() {
  return {
    decorateNode: function decorateNode() {
      return [];
    },
    renderAnnotation: function renderAnnotation(_ref) {
      var attributes = _ref.attributes,
          children = _ref.children;

      return React.createElement(
        'span',
        attributes,
        children
      );
    },
    renderBlock: function renderBlock(_ref2) {
      var attributes = _ref2.attributes,
          children = _ref2.children;

      return React.createElement(
        'div',
        _extends({}, attributes, { style: { position: 'relative' } }),
        children
      );
    },
    renderDecoration: function renderDecoration(_ref3) {
      var attributes = _ref3.attributes,
          children = _ref3.children;

      return React.createElement(
        'span',
        attributes,
        children
      );
    },
    renderDocument: function renderDocument(_ref4) {
      var children = _ref4.children;

      return children;
    },
    renderEditor: function renderEditor(_ref5) {
      var children = _ref5.children;

      return children;
    },
    renderInline: function renderInline(_ref6) {
      var attributes = _ref6.attributes,
          children = _ref6.children;

      return React.createElement(
        'span',
        _extends({}, attributes, { style: { position: 'relative' } }),
        children
      );
    },
    renderMark: function renderMark(_ref7) {
      var attributes = _ref7.attributes,
          children = _ref7.children;

      return React.createElement(
        'span',
        attributes,
        children
      );
    }
  };
}

function safelyGetParentKeyNode(node) {
  if (node == null) return null;

  if (node.closest == null) node = node.parentElement;
  if (node.hasAttribute(SELECTORS.KEY)) return node;
  return node.closest(SELECTORS.KEY);
}

function sanitizeDomOnError(editor, domNode, fn) {
  try {
    return { failed: false, value: fn() };
  } catch (e) {
    console.warn('Safely handling caught error, reconciling dom', e);

    // Woo!  So, if we get here, something has gone horribly wrong and the browser has modified the dom in a way
    // that slate can no longer understand.  So, in this event, we are going to replace the entire line (which changes
    // the react key and forces react to re-build the dom), and this will get everything back into a working state
    // hopefully.
    var domElement = safelyGetParentKeyNode(domNode);
    if (domElement == null) return { failed: true };

    var key = domElement.getAttribute(DATA_ATTRS.KEY);
    var slateNode = editor.value.document.getNode(key);
    if (slateNode == null) return { failed: true };

    var blockNode = slateNode.object === 'block' ? slateNode : editor.value.document.getClosestBlock(slateNode.key);
    if (blockNode == null) return { failed: true };

    var lineIndex = editor.value.document.nodes.indexOf(blockNode);
    var selection = domElement.ownerDocument.defaultView.getSelection();

    if (selection != null && selection.isCollapsed && blockNode === slateNode && lineIndex >= 0 && domElement.tagName === 'DIV' && domElement.childNodes.length === 1 && (domElement.childNodes[0] === selection.anchorNode || domElement === selection.anchorNode)) {
      console.log('    replacing entire line via dom text');

      editor.replaceNodeByKey(blockNode.key, Block.create({
        type: 'line',
        nodes: [Text.create({ text: domElement.textContent })]
      }));

      var newNode = editor.value.document.nodes.get(lineIndex);
      var textNode = newNode.nodes.first();
      var point = { key: textNode.key, offset: selection.anchorOffset };
      editor.select(Range.create({ anchor: point, focus: point }));
    } else {
      console.log('    replacing entire line');
      editor.replaceNodeByKey(blockNode.key, Block.create(blockNode.toJSON()));
    }

    return { failed: true };
  }
}

/**
 * Takes a `node`, find the matching `domNode` and uses it to set the text
 * in the `node`.
 *
 * @param {Editor} editor
 * @param {Node} node
 */

function reconcileNode(editor, node) {
  var value = editor.value;
  var document = value.document,
      selection = value.selection;

  var path = document.getPath(node.key);

  var domElement = editor.findDOMNode(path);
  var block = document.getClosestBlock(path);

  // Get text information
  var text = node.text;
  var domText = domElement.textContent;


  var isLastNode = block.nodes.last() === node;
  var lastChar = domText.charAt(domText.length - 1);

  // COMPAT: If this is the last leaf, and the DOM text ends in a new line,
  // we will have added another new line in <Leaf>'s render method to account
  // for browsers collapsing a single trailing new lines, so remove it.
  if (isLastNode && lastChar === '\n') {
    domText = domText.slice(0, -1);
  }

  // If the text is no different, abort.
  // Ignore all zero-width spaces here.  There will definitely be some in the dom
  // and we don't want those to make slate thing that the dom does not match the slate AST:
  if (text.replace(/[\uFEFF\b]/g, '') === domText.replace(/[\uFEFF\b]/g, '')) return;

  var entire = selection.moveAnchorTo(path, 0).moveFocusTo(path, text.length);

  entire = document.resolveRange(entire);

  console.warn('!!  Forced to reconcile dom node :((');

  // Change the current value to have the leaf's text replaced.
  editor.insertTextAtRange(entire, domText.replace(/[\uFEFF\b]/g, ''), node.marks);
  return;
}

/**
 * Takes text from the `domNode` and uses it to set the text in the matching
 * `node` in Slate.
 *
 * @param {Editor} editor
 * @param {DOMNode} domNode
 */

function reconcileDOMNode(editor, domNode) {
  return sanitizeDomOnError(editor, domNode, function () {
    var domElement = domNode.parentElement.closest('[data-key]');
    var node = editor.findNode(domElement);
    reconcileNode(editor, node);
  }).value;
}

/**
 * A set of commands for the React plugin.
 *
 * @return {Object}
 */

function CommandsPlugin() {
  return {
    commands: {
      reconcileNode: reconcileNode,
      reconcileDOMNode: reconcileDOMNode
    }
  };
}

/**
 * A set of queries for the React plugin.
 *
 * @return {Object}
 */

function QueriesPlugin() {
  /**
   * Find the native DOM element for a node at `path`.
   *
   * @param {Editor} editor
   * @param {Array|List} path
   * @return {DOMNode|Null}
   */

  function findDOMNode(editor, path) {
    path = PathUtils.create(path);
    var content = editor.tmp.contentRef.current;

    if (!content) {
      return null;
    }

    if (!path.size) {
      return content.ref.current || null;
    }

    var search = function search(instance, p) {
      if (!instance) {
        return null;
      }

      if (!p.size) {
        if (instance.ref) {
          return instance.ref.current || null;
        } else {
          return instance || null;
        }
      }

      var index = p.first();
      var rest = p.rest();
      var ref = instance.tmp.nodeRefs[index];
      return search(ref, rest);
    };

    var document = content.tmp.nodeRef.current;
    var el = search(document, path);
    return el;
  }

  /**
   * Find a native DOM selection point from a Slate `point`.
   *
   * @param {Editor} editor
   * @param {Point} point
   * @return {Object|Null}
   */

  function findDOMPoint(editor, point) {
    var el = findDOMNode(editor, point.path);
    var start = 0;

    if (!el) {
      return null;
    }

    // For each leaf, we need to isolate its content, which means filtering to its
    // direct text and zero-width spans. (We have to filter out any other siblings
    // that may have been rendered alongside them.)
    var texts = Array.from(el.querySelectorAll(SELECTORS.STRING + ', ' + SELECTORS.ZERO_WIDTH));

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = texts[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var text = _step.value;

        var node = text.childNodes[0];
        var domLength = node.textContent.length;
        var slateLength = domLength;

        if (text.hasAttribute(DATA_ATTRS.LENGTH)) {
          slateLength = parseInt(text.getAttribute(DATA_ATTRS.LENGTH), 10);
        }

        var end = start + slateLength;

        if (point.offset <= end) {
          var offset = Math.min(domLength, Math.max(0, point.offset - start));
          return { node: node, offset: offset };
        }

        start = end;
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    return null;
  }

  /**
   * Find a native DOM range from a Slate `range`.
   *
   * @param {Editor} editor
   * @param {Range} range
   * @return {DOMRange|Null}
   */

  function findDOMRange(editor, range) {
    var anchor = range.anchor,
        focus = range.focus,
        isBackward$$1 = range.isBackward,
        isCollapsed = range.isCollapsed;

    var domAnchor = findDOMPoint(editor, anchor);
    var domFocus = isCollapsed ? domAnchor : findDOMPoint(editor, focus);

    if (!domAnchor || !domFocus) {
      return null;
    }

    var r = editor.ownerWindow.document.createRange();
    var start = isBackward$$1 ? domFocus : domAnchor;
    var end = isBackward$$1 ? domAnchor : domFocus;
    r.setStart(start.node, start.offset);
    r.setEnd(end.node, end.offset);
    return r;
  }

  /**
   * Find a Slate node from a native DOM `element`.
   *
   * @param {Editor} editor
   * @param {Element} element
   * @return {List|Null}
   */

  function findNode(editor, element) {
    var path = findPath(editor, element);

    if (!path) {
      return null;
    }

    var value = editor.value;
    var document = value.document;

    var node = document.getNode(path);
    return node;
  }

  /**
   * Get the target range from a DOM `event`.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @return {Range}
   */

  function findEventRange(editor, event) {
    if (event.nativeEvent) {
      event = event.nativeEvent;
    }

    var _event = event,
        x = _event.clientX,
        y = _event.clientY,
        target = _event.target;

    if (x == null || y == null) return null;

    var value = editor.value;
    var document = value.document;

    var path = findPath(editor, event.target);
    if (!path) return null;

    var node = document.getNode(path);

    // If the drop target is inside a void node, move it into either the next or
    // previous node, depending on which side the `x` and `y` coordinates are
    // closest to.
    if (editor.isVoid(node)) {
      var rect = target.getBoundingClientRect();
      var isPrevious = node.object === 'inline' ? x - rect.left < rect.left + rect.width - x : y - rect.top < rect.top + rect.height - y;

      var _range = document.createRange();
      var move = isPrevious ? 'moveToEndOfNode' : 'moveToStartOfNode';
      var entry = document[isPrevious ? 'getPreviousText' : 'getNextText'](path);

      if (entry) {
        return _range[move](entry);
      }

      return null;
    }

    // Else resolve a range from the caret position where the drop occured.
    var doc = editor.ownerWindow.document;
    var native = void 0;

    // COMPAT: In Firefox, `caretRangeFromPoint` doesn't exist. (2016/07/25)
    if (doc.caretRangeFromPoint) {
      native = doc.caretRangeFromPoint(x, y);
    } else if (doc.caretPositionFromPoint) {
      var position = doc.caretPositionFromPoint(x, y);
      native = doc.createRange();
      native.setStart(position.offsetNode, position.offset);
      native.setEnd(position.offsetNode, position.offset);
    } else if (doc.body.createTextRange) {
      // COMPAT: In IE, `caretRangeFromPoint` and
      // `caretPositionFromPoint` don't exist. (2018/07/11)
      native = doc.body.createTextRange();

      try {
        native.moveToPoint(x, y);
      } catch (error) {
        // IE11 will raise an `unspecified error` if `moveToPoint` is
        // called during a dropEvent.
        return null;
      }
    }

    // Resolve a Slate range from the DOM range.
    var range = findRange(editor, native);
    return range;
  }

  /**
   * Find the path of a native DOM `element` by searching React refs.
   *
   * @param {Editor} editor
   * @param {Element} element
   * @return {List|Null}
   */

  function findPath(editor, element) {
    var content = editor.tmp.contentRef.current;
    var nodeElement = element;

    // If element does not have a key, it is likely a string or
    // mark, return the closest parent Node that can be looked up.
    if (!nodeElement.hasAttribute(DATA_ATTRS.KEY)) {
      nodeElement = nodeElement.closest(SELECTORS.KEY);
    }

    var key = nodeElement == null ? null : nodeElement.getAttribute(DATA_ATTRS.KEY);

    if (!nodeElement || !key) {
      return null;
    }

    if (nodeElement === content.ref.current) {
      return PathUtils.create([]);
    }

    var docPath = editor.value.document.getPath(key);
    if (docPath) return docPath;

    var search = function search(instance, p) {
      if (nodeElement === instance) {
        return p;
      }

      if (!instance.ref) {
        return null;
      }

      if (nodeElement === instance.ref.current) {
        return p;
      }

      // If there's no `tmp` then we're at a leaf node without success.
      if (!instance.tmp) {
        return null;
      }

      var nodeRefs = instance.tmp.nodeRefs;

      var keys = Object.keys(nodeRefs);

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = keys[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var i = _step2.value;

          var ref = nodeRefs[i];
          var n = parseInt(i, 10);
          var _path = search(ref, [].concat(toConsumableArray(p), [n]));

          if (_path) {
            return _path;
          }
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      return null;
    };

    var document = content.tmp.nodeRef.current;
    var path = search(document, []);

    if (!path) {
      return null;
    }

    return PathUtils.create(path);
  }

  /**
   * Find a Slate point from a DOM selection's `nativeNode` and `nativeOffset`.
   *
   * @param {Editor} editor
   * @param {Element} nativeNode
   * @param {Number} nativeOffset
   * @return {Point}
   */

  function findPoint(editor, nativeNode, nativeOffset) {
    var _normalizeNodeAndOffs = normalizeNodeAndOffset(nativeNode, nativeOffset),
        nearestNode = _normalizeNodeAndOffs.node,
        nearestOffset = _normalizeNodeAndOffs.offset;

    var parentNode = nearestNode.parentNode;

    var leafNode = parentNode.closest(SELECTORS.LEAF);
    var textNode = void 0;
    var offset = void 0;
    var node = void 0;

    // Calculate how far into the text node the `nearestNode` is, so that we can
    // determine what the offset relative to the text node is.
    if (leafNode) {
      textNode = leafNode.closest(SELECTORS.TEXT);
      var range = editor.ownerWindow.document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(nearestNode, nearestOffset);
      var contents = range.cloneContents();
      var zeroWidths = contents.querySelectorAll(SELECTORS.ZERO_WIDTH);

      Array.from(zeroWidths).forEach(function (el) {
        el.parentNode.removeChild(el);
      });

      // COMPAT: Edge has a bug where Range.prototype.toString() will convert \n
      // into \r\n. The bug causes a loop when slate-react attempts to reposition
      // its cursor to match the native position. Use textContent.length instead.
      // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/10291116/
      offset = contents.textContent.length;
      node = textNode;
    } else {
      // For void nodes, the element with the offset key will be a cousin, not an
      // ancestor, so find it by going down from the nearest void parent.
      var voidNode = parentNode.closest(SELECTORS.VOID);

      if (!voidNode) {
        return null;
      }

      leafNode = voidNode.querySelector(SELECTORS.LEAF);

      if (!leafNode) {
        return null;
      }

      textNode = leafNode.closest(SELECTORS.TEXT);
      node = leafNode;
      offset = node.textContent.length;
    }

    // COMPAT: If the parent node is a Slate zero-width space, this is because the
    // text node should have no characters. However, during IME composition the
    // ASCII characters will be prepended to the zero-width space, so subtract 1
    // from the offset to account for the zero-width space character.
    if (offset === node.textContent.length && parentNode.hasAttribute(DATA_ATTRS.ZERO_WIDTH)) {
      offset--;
    }

    // COMPAT: If someone is clicking from one Slate editor into another, the
    // select event fires twice, once for the old editor's `element` first, and
    // then afterwards for the correct `element`. (2017/03/03)
    var path = findPath(editor, textNode);

    if (!path) {
      return null;
    }

    var value = editor.value;
    var document = value.document;

    var point = document.createPoint({ path: path, offset: offset });
    return point;
  }

  /**
   * Find a Slate range from a DOM range or selection.
   *
   * @param {Editor} editor
   * @param {Selection} domRange
   * @return {Range}
   */

  function findRange(editor, domRange) {
    var el = domRange.anchorNode || domRange.startContainer;

    if (!el) {
      return null;
    }

    // If the `domRange` object is a DOM `Range` or `StaticRange` object, change it
    // into something that looks like a DOM `Selection` instead.
    if (domRange instanceof editor.ownerWindow.Range || editor.ownerWindow.StaticRange && domRange instanceof editor.ownerWindow.StaticRange) {
      domRange = {
        anchorNode: domRange.startContainer,
        anchorOffset: domRange.startOffset,
        focusNode: domRange.endContainer,
        focusOffset: domRange.endOffset
      };
    }

    var _domRange = domRange,
        anchorNode = _domRange.anchorNode,
        anchorOffset = _domRange.anchorOffset,
        focusNode = _domRange.focusNode,
        focusOffset = _domRange.focusOffset,
        isCollapsed = _domRange.isCollapsed;
    var value = editor.value;

    var anchor = findPoint(editor, anchorNode, anchorOffset);
    var focus = isCollapsed ? anchor : findPoint(editor, focusNode, focusOffset);

    if (!anchor || !focus) {
      return null;
    }

    var document = value.document;

    var range = document.createRange({
      anchor: anchor,
      focus: focus
    });

    return range;
  }

  /**
   * Find a Slate selection from a DOM selection.
   *
   * @param {Editor} editor
   * @param {Selection} domSelection
   * @return {Range}
   */

  function findSelection(editor, domSelection) {
    var value = editor.value;
    var document = value.document;

    // If there are no ranges, the editor was blurred natively.

    if (!domSelection.rangeCount) {
      return null;
    }

    // Otherwise, determine the Slate selection from the native one.
    var range = findRange(editor, domSelection);

    if (!range) {
      return null;
    }

    var _range2 = range,
        anchor = _range2.anchor,
        focus = _range2.focus;

    var anchorText = document.getNode(anchor.path);
    var focusText = document.getNode(focus.path);
    var anchorInline = document.getClosestInline(anchor.path);
    var focusInline = document.getClosestInline(focus.path);
    var focusBlock = document.getClosestBlock(focus.path);
    var anchorBlock = document.getClosestBlock(anchor.path);

    // COMPAT: If the anchor point is at the start of a non-void, and the
    // focus point is inside a void node with an offset that isn't `0`, set
    // the focus offset to `0`. This is due to void nodes <span>'s being
    // positioned off screen, resulting in the offset always being greater
    // than `0`. Since we can't know what it really should be, and since an
    // offset of `0` is less destructive because it creates a hanging
    // selection, go with `0`. (2017/09/07)
    if (anchorBlock && !editor.isVoid(anchorBlock) && anchor.offset === 0 && focusBlock && editor.isVoid(focusBlock) && focus.offset !== 0) {
      range = range.setFocus(focus.setOffset(0));
    }

    // COMPAT: If the selection is at the end of a non-void inline node, and
    // there is a node after it, put it in the node after instead. This
    // standardizes the behavior, since it's indistinguishable to the user.
    if (anchorInline && !editor.isVoid(anchorInline) && anchor.offset === anchorText.text.length) {
      var block = document.getClosestBlock(anchor.path);
      var depth = document.getDepth(block.key);
      var relativePath = PathUtils.drop(anchor.path, depth);

      var _block$texts = block.texts({ path: relativePath }),
          _block$texts2 = slicedToArray(_block$texts, 1),
          next = _block$texts2[0];

      if (next) {
        var _next = slicedToArray(next, 2),
            nextPath = _next[1];

        var absolutePath = anchor.path.slice(0, depth).concat(nextPath);
        range = range.moveAnchorTo(absolutePath, 0);
      }
    }

    if (focusInline && !editor.isVoid(focusInline) && focus.offset === focusText.text.length) {
      var _block = document.getClosestBlock(focus.path);
      var _depth = document.getDepth(_block.key);
      var _relativePath = PathUtils.drop(focus.path, _depth);

      var _block$texts3 = _block.texts({ path: _relativePath }),
          _block$texts4 = slicedToArray(_block$texts3, 1),
          _next2 = _block$texts4[0];

      if (_next2) {
        var _next3 = slicedToArray(_next2, 2),
            _nextPath = _next3[1];

        var _absolutePath = focus.path.slice(0, _depth).concat(_nextPath);
        range = range.moveFocusTo(_absolutePath, 0);
      }
    }

    var selection = document.createSelection(range);

    // COMPAT: Ensure that the `isFocused` argument is set.
    selection = selection.setIsFocused(true);

    // COMPAT: Preserve the marks, since we have no way of knowing what the DOM
    // selection's marks were. They will be cleared automatically by the
    // `select` command if the selection moves.
    selection = selection.set('marks', value.selection.marks);

    return selection;
  }

  return {
    queries: {
      findDOMNode: findDOMNode,
      findDOMPoint: findDOMPoint,
      findDOMRange: findDOMRange,
      findEventRange: findEventRange,
      findNode: findNode,
      findPath: findPath,
      findPoint: findPoint,
      findRange: findRange,
      findSelection: findSelection
    }
  };
}

/**
 * From a DOM selection's `node` and `offset`, normalize so that it always
 * refers to a text node.
 *
 * @param {Element} node
 * @param {Number} offset
 * @return {Object}
 */

function normalizeNodeAndOffset(node, offset) {
  // If it's an element node, its offset refers to the index of its children
  // including comment nodes, so try to find the right text child node.
  if (node.nodeType === 1 && node.childNodes.length) {
    var isFirst = offset === 0;
    var direction = isFirst ? 'forward' : 'backward';
    var index = isFirst ? offset : offset - 1;
    node = getEditableChild(node, index, direction);

    // If the node has children, traverse until we have a leaf node. Leaf nodes
    // can be either text nodes, or other void DOM nodes.
    while (node.nodeType === 1 && node.childNodes.length) {
      var i = isFirst ? 0 : node.childNodes.length - 1;
      node = getEditableChild(node, i, direction);
    }

    // Determine the new offset inside the text node.
    offset = isFirst ? 0 : node.textContent.length;
  }

  // Return the node and offset.
  return { node: node, offset: offset };
}

/**
 * Get the nearest editable child at `index` in a `parent`, preferring
 * `direction`.
 *
 * @param {Element} parent
 * @param {Number} index
 * @param {String} direction ('forward' or 'backward')
 * @return {Element|Null}
 */

function getEditableChild(parent, index, direction) {
  var childNodes = parent.childNodes;

  var child = childNodes[index];
  var i = index;
  var triedForward = false;
  var triedBackward = false;

  // While the child is a comment node, or an element node with no children,
  // keep iterating to find a sibling non-void, non-comment node.
  while (child.nodeType === 8 || child.nodeType === 1 && child.childNodes.length === 0 || child.nodeType === 1 && child.getAttribute('contenteditable') === 'false') {
    if (triedForward && triedBackward) break;

    if (i >= childNodes.length) {
      triedForward = true;
      i = index - 1;
      direction = 'backward';
      continue;
    }

    if (i < 0) {
      triedBackward = true;
      i = index + 1;
      direction = 'forward';
      continue;
    }

    child = childNodes[i];
    if (direction === 'forward') i++;
    if (direction === 'backward') i--;
  }

  return child || null;
}

/**
 * The transfer types that Slate recognizes.
 *
 * @type {Object}
 */

var TRANSFER_TYPES = {
  FRAGMENT: 'application/x-slate-fragment',
  HTML: 'text/html',
  NODE: 'application/x-slate-node',
  RICH: 'text/rtf',
  TEXT: 'text/plain'
};

var FRAGMENT = TRANSFER_TYPES.FRAGMENT;
var HTML = TRANSFER_TYPES.HTML;
var TEXT = TRANSFER_TYPES.TEXT;

/**
 * Prepares a Slate document fragment to be copied to the clipboard.
 *
 * @param {Event} event
 * @param {Editor} editor
 */

function cloneFragment(event, editor) {
  var callback = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function () {
    return undefined;
  };

  invariant(!Value.isValue(editor), 'As of Slate 0.42.0, the `cloneFragment` utility takes an `editor` instead of a `value`.');

  var native = editor.ownerWindow.getSelection();
  var value = editor.value;
  var document = value.document,
      fragment = value.fragment,
      selection = value.selection;
  var start = selection.start,
      end = selection.end;

  var startVoid = document.getClosestVoid(start.path, editor);
  var endVoid = document.getClosestVoid(end.path, editor);

  // If the selection is collapsed, and it isn't inside a void node, abort.
  if (native.isCollapsed && !startVoid) return;

  // Create a fake selection so that we can add a Base64-encoded copy of the
  // fragment to the HTML, to decode on future pastes.
  var encoded = Base64.serializeNode(fragment);
  var range = native.getRangeAt(0);
  var contents = range.cloneContents();
  var attach = contents.childNodes[0];

  // Make sure attach is a non-empty node, since empty nodes will not get copied
  contents.childNodes.forEach(function (node) {
    if (node.textContent && node.textContent.trim() !== '') {
      attach = node;
    }
  });

  // COMPAT: If the end node is a void node, we need to move the end of the
  // range from the void node's spacer span, to the end of the void node's
  // content, since the spacer is before void's content in the DOM.
  if (endVoid) {
    var r = range.cloneRange();
    var path = document.getPath(endVoid.key);

    if (path) {
      var node = editor.findDOMNode(path);
      r.setEndAfter(node);
      contents = r.cloneContents();
    }
  }

  // COMPAT: If the start node is a void node, we need to attach the encoded
  // fragment to the void node's content node instead of the spacer, because
  // attaching it to empty `<div>/<span>` nodes will end up having it erased by
  // most browsers. (2018/04/27)
  if (startVoid) {
    attach = contents.childNodes[0].childNodes[1].firstChild;
  }

  // Remove any zero-width space spans from the cloned DOM so that they don't
  // show up elsewhere when pasted.
  [].slice.call(contents.querySelectorAll(SELECTORS.ZERO_WIDTH)).forEach(function (zw) {
    var isNewline = zw.getAttribute(DATA_ATTRS.ZERO_WIDTH) === 'n';
    zw.textContent = isNewline ? '\n' : '';
  });

  // Set a `data-slate-fragment` attribute on a non-empty node, so it shows up
  // in the HTML, and can be used for intra-Slate pasting. If it's a text
  // node, wrap it in a `<span>` so we have something to set an attribute on.
  if (attach.nodeType === 3) {
    var span = editor.ownerWindow.document.createElement('span');

    // COMPAT: In Chrome and Safari, if we don't add the `white-space` style
    // then leading and trailing spaces will be ignored. (2017/09/21)
    span.style.whiteSpace = 'pre';

    span.appendChild(attach);
    contents.appendChild(span);
    attach = span;
  }

  attach.setAttribute(DATA_ATTRS.FRAGMENT, encoded);

  //  Creates value from only the selected blocks
  //  Then gets plaintext for clipboard with proper linebreaks for BLOCK elements
  //  Via Plain serializer
  var valFromSelection = Value.create({ document: fragment });
  var plainText = Plain.serialize(valFromSelection);

  // Add the phony content to a div element. This is needed to copy the
  // contents into the html clipboard register.
  var div = editor.ownerWindow.document.createElement('div');
  div.appendChild(contents);

  // For browsers supporting it, we set the clipboard registers manually,
  // since the result is more predictable.
  // COMPAT: IE supports the setData method, but only in restricted sense.
  // IE doesn't support arbitrary MIME types or common ones like 'text/plain';
  // it only accepts "Text" (which gets mapped to 'text/plain') and "Url"
  // (mapped to 'text/url-list'); so, we should only enter block if !IS_IE
  if (event.clipboardData && event.clipboardData.setData && !IS_IE) {
    event.preventDefault();
    event.clipboardData.setData(TEXT, plainText);
    event.clipboardData.setData(FRAGMENT, encoded);
    event.clipboardData.setData(HTML, div.innerHTML);
    callback();
    return;
  }

  // COMPAT: For browser that don't support the Clipboard API's setData method,
  // we must rely on the browser to natively copy what's selected.
  // So we add the div (containing our content) to the DOM, and select it.
  var editorEl = event.target.closest(SELECTORS.EDITOR);
  div.setAttribute('contenteditable', true);
  div.style.position = 'absolute';
  div.style.left = '-9999px';
  editorEl.appendChild(div);
  native.selectAllChildren(div);

  // Revert to the previous selection right after copying.
  editor.ownerWindow.requestAnimationFrame(function () {
    editorEl.removeChild(div);
    removeAllRanges(native);
    native.addRange(range);
    callback();
  });
}

/**
 * Transfer types.
 *
 * @type {String}
 */

var FRAGMENT$1 = TRANSFER_TYPES.FRAGMENT;
var HTML$1 = TRANSFER_TYPES.HTML;
var NODE = TRANSFER_TYPES.NODE;
var RICH = TRANSFER_TYPES.RICH;
var TEXT$1 = TRANSFER_TYPES.TEXT;

/**
 * Fragment matching regexp for HTML nodes.
 *
 * @type {RegExp}
 */

var FRAGMENT_MATCHER = / data-slate-fragment="([^\s"]+)"/;

/**
 * Get the transfer data from an `event`.
 *
 * @param {Event} event
 * @return {Object}
 */

function getEventTransfer(event) {
  // COMPAT: IE 11 doesn't populate nativeEvent with either
  // dataTransfer or clipboardData. We'll need to use the base event
  // object (2018/14/6)
  if (!IS_IE && event.nativeEvent) {
    event = event.nativeEvent;
  }

  var transfer = event.dataTransfer || event.clipboardData;
  var fragment = getType(transfer, FRAGMENT$1);
  var node = getType(transfer, NODE);
  var html = getType(transfer, HTML$1);
  var rich = getType(transfer, RICH);
  var text = getType(transfer, TEXT$1);
  var files = void 0;

  // If there isn't a fragment, but there is HTML, check to see if the HTML is
  // actually an encoded fragment.
  if (!fragment && html && ~html.indexOf(' ' + DATA_ATTRS.FRAGMENT + '="')) {
    var matches = FRAGMENT_MATCHER.exec(html);

    var _matches = slicedToArray(matches, 2),
        full = _matches[0],
        encoded = _matches[1]; // eslint-disable-line no-unused-vars


    if (encoded) fragment = encoded;
  }

  // COMPAT: Edge doesn't handle custom data types
  // These will be embedded in text/plain in this case (2017/7/12)
  if (text) {
    var embeddedTypes = getEmbeddedTypes(text);

    if (embeddedTypes[FRAGMENT$1]) fragment = embeddedTypes[FRAGMENT$1];
    if (embeddedTypes[NODE]) node = embeddedTypes[NODE];
    if (embeddedTypes[TEXT$1]) text = embeddedTypes[TEXT$1];
  }

  // Decode a fragment or node if they exist.
  if (fragment) fragment = Base64.deserializeNode(fragment);
  if (node) node = Base64.deserializeNode(node);

  // COMPAT: Edge sometimes throws 'NotSupportedError'
  // when accessing `transfer.items` (2017/7/12)
  try {
    // Get and normalize files if they exist.
    if (transfer.items && transfer.items.length) {
      files = Array.from(transfer.items).map(function (item) {
        return item.kind === 'file' ? item.getAsFile() : null;
      }).filter(function (exists) {
        return exists;
      });
    } else if (transfer.files && transfer.files.length) {
      files = Array.from(transfer.files);
    }
  } catch (err) {
    if (transfer.files && transfer.files.length) {
      files = Array.from(transfer.files);
    }
  }

  // Determine the type of the data.
  var data = { files: files, fragment: fragment, html: html, node: node, rich: rich, text: text };
  data.type = getTransferType(data);
  return data;
}

/**
 * Takes text input, checks whether contains embedded data
 * and returns object with original text +/- additional data
 *
 * @param {String} text
 * @return {Object}
 */

function getEmbeddedTypes(text) {
  var prefix = 'SLATE-DATA-EMBED::';

  if (text.substring(0, prefix.length) !== prefix) {
    return { TEXT: text };
  }

  // Attempt to parse, if fails then just standard text/plain
  // Otherwise, already had data embedded
  try {
    return JSON.parse(text.substring(prefix.length));
  } catch (err) {
    throw new Error('Unable to parse custom Slate drag event data.');
  }
}

/**
 * Get the type of a transfer from its `data`.
 *
 * @param {Object} data
 * @return {String}
 */

function getTransferType(data) {
  if (data.fragment) return 'fragment';
  if (data.node) return 'node';

  // COMPAT: Microsoft Word adds an image of the selected text to the data.
  // Since files are preferred over HTML or text, this would cause the type to
  // be considered `files`. But it also adds rich text data so we can check
  // for that and properly set the type to `html` or `text`. (2016/11/21)
  if (data.rich && data.html) return 'html';
  if (data.rich && data.text) return 'text';

  if (data.files && data.files.length) return 'files';
  if (data.html) return 'html';
  if (data.text) return 'text';
  return 'unknown';
}

/**
 * Get one of types `TYPES.FRAGMENT`, `TYPES.NODE`, `text/html`, `text/rtf` or
 * `text/plain` from transfers's `data` if possible, otherwise return null.
 *
 * @param {Object} transfer
 * @param {String} type
 * @return {String}
 */

function getType(transfer, type) {
  if (!transfer.types || !transfer.types.length) {
    // COMPAT: In IE 11, there is no `types` field but `getData('Text')`
    // is supported`. (2017/06/23)
    return type === TEXT$1 ? transfer.getData('Text') || null : null;
  }

  // COMPAT: In Edge, transfer.types doesn't respond to `indexOf`. (2017/10/25)
  var types = Array.from(transfer.types);

  return types.indexOf(type) !== -1 ? transfer.getData(type) || null : null;
}

/**
 * The default plain text transfer type.
 *
 * @type {String}
 */

var TEXT$2 = TRANSFER_TYPES.TEXT;

/**
 * Set data with `type` and `content` on an `event`.
 *
 * COMPAT: In Edge, custom types throw errors, so embed all non-standard
 * types in text/plain compound object. (2017/7/12)
 *
 * @param {Event} event
 * @param {String} type
 * @param {String} content
 */

function setEventTransfer(event, type, content) {
  var mime = TRANSFER_TYPES[type.toUpperCase()];

  if (!mime) {
    throw new Error('Cannot set unknown transfer type "' + mime + '".');
  }

  if (event.nativeEvent) {
    event = event.nativeEvent;
  }

  var transfer = event.dataTransfer || event.clipboardData;

  try {
    transfer.setData(mime, content);
    // COMPAT: Safari needs to have the 'text' (and not 'text/plain') value in dataTransfer
    // to display the cursor while dragging internally.
    transfer.setData('text', transfer.getData('text'));
  } catch (err) {
    var prefix = 'SLATE-DATA-EMBED::';
    var text = transfer.getData(TEXT$2);
    var obj = {};

    // If the existing plain text data is prefixed, it's Slate JSON data.
    if (text.substring(0, prefix.length) === prefix) {
      try {
        obj = JSON.parse(text.substring(prefix.length));
      } catch (e) {
        throw new Error('Failed to parse Slate data from `DataTransfer` object.');
      }
    } else {
      // Otherwise, it's just set it as is.
      obj[TEXT$2] = text;
    }

    obj[mime] = content;
    var string = '' + prefix + JSON.stringify(obj);
    transfer.setData(TEXT$2, string);
  }
}

/**
 * Debug.
 *
 * @type {Function}
 */

var debug$1 = Debug('slate:after');

/**
 * A plugin that adds the "after" browser-specific logic to the editor.
 *
 * @param {Object} options
 * @return {Object}
 */

function AfterPlugin() {
  var isDraggingInternally = null;
  var isMouseDown = false;

  /**
   * On before input.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onBeforeInput(event, editor, next) {
    var value = editor.value;

    // Otherwise, we can use the information in the `beforeinput` event to
    // figure out the exact change that will occur, and prevent it.

    var _event$getTargetRange = event.getTargetRanges(),
        _event$getTargetRange2 = slicedToArray(_event$getTargetRange, 1),
        targetRange = _event$getTargetRange2[0];

    if (!targetRange) return next();

    debug$1('onBeforeInput', { event: event });

    event.preventDefault();

    var document = value.document,
        selection = value.selection;

    var range = editor.findRange(targetRange);

    switch (event.inputType) {
      case 'deleteByDrag':
      case 'deleteByCut':
      case 'deleteContent':
      case 'deleteContentBackward':
      case 'deleteContentForward':
        {
          editor.deleteAtRange(range);
          break;
        }

      case 'deleteWordBackward':
        {
          editor.deleteWordBackwardAtRange(range);
          break;
        }

      case 'deleteWordForward':
        {
          editor.deleteWordForwardAtRange(range);
          break;
        }

      case 'deleteSoftLineBackward':
      case 'deleteHardLineBackward':
        {
          editor.deleteLineBackwardAtRange(range);
          break;
        }

      case 'deleteSoftLineForward':
      case 'deleteHardLineForward':
        {
          editor.deleteLineForwardAtRange(range);
          break;
        }

      case 'insertLineBreak':
      case 'insertParagraph':
        {
          var hasVoidParent = document.hasVoidParent(selection.start.path, editor);

          if (hasVoidParent) {
            editor.moveToStartOfNextText();
          } else {
            editor.splitBlockAtRange(range);
          }

          break;
        }

      case 'insertFromYank':
      case 'insertReplacementText':
      case 'insertText':
        {
          // COMPAT: `data` should have the text for the `insertText` input type
          // and `dataTransfer` should have the text for the
          // `insertReplacementText` input type, but Safari uses `insertText` for
          // spell check replacements and sets `data` to `null`. (2018/08/09)
          var text = event.data == null ? event.dataTransfer.getData('text/plain') : event.data;

          if (text == null) break;

          editor.insertTextAtRange(range, text, selection.marks);

          // If the text was successfully inserted, and the selection had marks
          // on it, unset the selection's marks.
          if (selection.marks && value.document !== editor.value.document) {
            editor.select({ marks: null });
          }

          break;
        }
    }

    next();
  }

  /**
   * On blur.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onBlur(event, editor, next) {
    debug$1('onBlur', { event: event });
    editor.blur();
    next();
  }

  /**
   * On click.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onClick(event, editor, next) {
    if (editor.readOnly) return next();

    var value = editor.value;
    var document = value.document;

    var path = editor.findPath(event.target);
    if (!path) return next();

    debug$1('onClick', { event: event });

    var node = document.getNode(path);
    var ancestors = document.getAncestors(path);
    var isVoid = node && (editor.isVoid(node) || ancestors.some(function (a) {
      return editor.isVoid(a);
    }));

    if (isVoid) {
      // COMPAT: In Chrome & Safari, selections that are at the zero offset of
      // an inline node will be automatically replaced to be at the last offset
      // of a previous inline node, which screws us up, so we always want to set
      // it to the end of the node. (2016/11/29)
      editor.focus().moveToEndOfNode(node);
    }

    next();
  }

  /**
   * On copy.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onCopy(event, editor, next) {
    debug$1('onCopy', { event: event });
    cloneFragment(event, editor);
    next();
  }

  /**
   * On cut.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onCut(event, editor, next) {
    debug$1('onCut', { event: event });

    // Once the fake cut content has successfully been added to the clipboard,
    // delete the content in the current selection.
    cloneFragment(event, editor, function () {
      // If user cuts a void block node or a void inline node,
      // manually removes it since selection is collapsed in this case.
      var value = editor.value;
      var document = value.document,
          selection = value.selection;
      var end = selection.end,
          isCollapsed = selection.isCollapsed;

      var voidPath = void 0;

      if (isCollapsed) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = document.ancestors(end.path)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var _ref = _step.value;

            var _ref2 = slicedToArray(_ref, 2);

            var node = _ref2[0];
            var path = _ref2[1];

            if (editor.isVoid(node)) {
              voidPath = path;
              break;
            }
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      }

      if (voidPath) {
        editor.removeNodeByKey(voidPath);
      } else {
        editor.delete();
      }
    });

    next();
  }

  /**
   * On drag end.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onDragEnd(event, editor, next) {
    debug$1('onDragEnd', { event: event });
    isDraggingInternally = null;
    next();
  }

  /**
   * On drag start.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onDragStart(event, editor, next) {
    debug$1('onDragStart', { event: event });

    isDraggingInternally = true;

    var value = editor.value;
    var document = value.document;

    var path = editor.findPath(event.target);
    var node = document.getNode(path);
    var ancestors = document.getAncestors(path);
    var isVoid = node && (editor.isVoid(node) || ancestors.some(function (a) {
      return editor.isVoid(a);
    }));
    var selectionIncludesNode = value.blocks.some(function (block) {
      return block === node;
    });

    // If a void block is dragged and is not selected, select it (necessary for local drags).
    if (isVoid && !selectionIncludesNode) {
      editor.moveToRangeOfNode(node);
    }

    var fragment = editor.value.fragment;
    var encoded = Base64.serializeNode(fragment);
    setEventTransfer(event, 'fragment', encoded);
    next();
  }

  /**
   * On drop.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onDrop(event, editor, next) {
    var value = editor.value;
    var document = value.document,
        selection = value.selection;

    var window = getWindow(event.target);
    var target = editor.findEventRange(event);

    if (!target) {
      return next();
    }

    debug$1('onDrop', { event: event });

    var transfer = getEventTransfer(event);
    var type = transfer.type,
        fragment = transfer.fragment,
        text = transfer.text;


    editor.focus();

    // COMPAT: React's onSelect event breaks after an onDrop event
    // has fired in a node: https://github.com/facebook/react/issues/11379.
    // Until this is fixed in React, we dispatch a mouseup event on that
    // DOM node, since that will make it go back to normal.
    var el = editor.findDOMNode(target.focus.path);

    if (el) {
      el.dispatchEvent(new MouseEvent('mouseup', {
        view: window,
        bubbles: true,
        cancelable: true
      }));
    }

    var draggedRange = selection;

    editor.select(target);

    if (isDraggingInternally) {
      editor.deleteAtRange(draggedRange);
    }

    if (type === 'text' || type === 'html') {
      var anchor = target.anchor;

      var hasVoidParent = document.hasVoidParent(anchor.path, editor);

      if (hasVoidParent) {
        var p = anchor.path;
        var n = document.getNode(anchor.path);

        while (hasVoidParent) {
          var _document$texts = document.texts({ path: p }),
              _document$texts2 = slicedToArray(_document$texts, 1),
              nxt = _document$texts2[0];

          if (!nxt) {
            break;
          }

          
          var _nxt = slicedToArray(nxt, 2);

          n = _nxt[0];
          p = _nxt[1];

          hasVoidParent = document.hasVoidParent(p, editor);
        }

        if (n) editor.moveToStartOfNode(n);
      }

      if (text) {
        text.split('\n').forEach(function (line, i) {
          if (i > 0) editor.splitBlock();
          editor.insertText(line);
        });
      }
    }

    if (type === 'fragment') {
      editor.insertFragment(fragment);
    }

    next();
  }

  /**
   * On focus.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onFocus(event, editor, next) {
    debug$1('onFocus', { event: event });

    // COMPAT: If the focus event is a mouse-based one, it will be shortly
    // followed by a `selectionchange`, so we need to deselect here to prevent
    // the old selection from being set by the `updateSelection` of `<Content>`,
    // preventing the `selectionchange` from firing. (2018/11/07)
    if (isMouseDown && !IS_IE && !IS_EDGE) {
      editor.deselect().focus();
    } else {
      editor.focus();
    }

    next();
  }

  /**
   * On input.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onInput(event, editor, next) {
    debug$1('onInput');

    var domSelection = editor.ownerWindow.getSelection();
    var selection = editor.findSelection(domSelection);

    if (selection) {
      editor.select(selection);
    } else {
      editor.blur();
    }

    // prettier-ignore
    if (window.ENABLE_SLATE_LOGGING) console.log('    flush selAfterOnInput:', JSON.stringify(editor.value.selection.toJSON()));

    var anchorNode = domSelection.anchorNode;

    editor.reconcileDOMNode(anchorNode);

    // prettier-ignore
    if (window.ENABLE_SLATE_LOGGING) console.log('    flush selAfterReconci:', JSON.stringify(editor.value.selection.toJSON()));
    // prettier-ignore
    if (window.ENABLE_SLATE_LOGGING) console.log('    editor: len: ' + editor.value.document.text.length + ' selSlate: ' + editor.value.selection.anchor.offset + ' selNative: ' + editor.ownerWindow.getSelection().anchorOffset + ' document: ' + JSON.stringify(editor.value.document.toJSON()));

    next();
  }

  /**
   * On key down.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onKeyDown(event, editor, next) {
    debug$1('onKeyDown', { event: event });

    var value = editor.value;
    var document = value.document,
        selection = value.selection;
    var start = selection.start;


    var selectedBlock = document.getClosestBlock(start.path);
    var isRtl = selectedBlock != null && selectedBlock.getTextDirection() === 'rtl';

    if (Hotkeys.isDeleteBackward(event) && !IS_IOS) {
      return editor.deleteCharBackward();
    }

    if (Hotkeys.isDeleteForward(event) && !IS_IOS) {
      return editor.deleteCharForward();
    }

    if (Hotkeys.isDeleteLineBackward(event)) {
      return editor.deleteLineBackward();
    }

    if (Hotkeys.isDeleteLineForward(event)) {
      return editor.deleteLineForward();
    }

    if (Hotkeys.isDeleteWordBackward(event)) {
      return editor.deleteWordBackward();
    }

    if (Hotkeys.isDeleteWordForward(event)) {
      return editor.deleteWordForward();
    }

    if (Hotkeys.isRedo(event)) {
      return editor.redo();
    }

    if (Hotkeys.isUndo(event)) {
      return editor.undo();
    }

    // COMPAT: Certain browsers don't handle the selection updates properly. In
    // Chrome, the selection isn't properly extended. And in Firefox, the
    // selection isn't properly collapsed. (2017/10/17)
    if (Hotkeys.isMoveLineBackward(event)) {
      event.preventDefault();
      return isRtl ? editor.moveToEndOfBlock() : editor.moveToStartOfBlock();
    }

    if (Hotkeys.isMoveLineForward(event)) {
      event.preventDefault();
      return isRtl ? editor.moveToStartOfBlock() : editor.moveToEndOfBlock();
    }

    if (Hotkeys.isExtendLineBackward(event)) {
      event.preventDefault();
      return isRtl ? editor.moveFocusToEndOfBlock() : editor.moveFocusToStartOfBlock();
    }

    if (Hotkeys.isExtendLineForward(event)) {
      event.preventDefault();
      return isRtl ? editor.moveFocusToStartOfBlock() : editor.moveFocusToEndOfBlock();
    }

    // COMPAT: If a void node is selected, or a zero-width text node adjacent to
    // an inline is selected, we need to handle these hotkeys manually because
    // browsers won't know what to do.
    if (Hotkeys.isMoveBackward(event)) {
      event.preventDefault();

      if (!selection.isCollapsed) {
        return isRtl ? editor.moveToEnd() : editor.moveToStart();
      }

      return isRtl ? editor.moveForward() : editor.moveBackward();
    }

    if (Hotkeys.isMoveForward(event)) {
      event.preventDefault();

      if (!selection.isCollapsed) {
        return isRtl ? editor.moveToStart() : editor.moveToEnd();
      }

      return isRtl ? editor.moveBackward() : editor.moveForward();
    }

    if (Hotkeys.isMoveWordBackward(event)) {
      event.preventDefault();
      return isRtl ? editor.moveWordForward() : editor.moveWordBackward();
    }

    if (Hotkeys.isMoveWordForward(event)) {
      event.preventDefault();
      return isRtl ? editor.moveWordBackward() : editor.moveWordForward();
    }

    if (!isRtl && Hotkeys.isExtendBackward(event) || isRtl && Hotkeys.isExtendForward(event)) {
      event.preventDefault();
      return editor.moveFocusBackward();
    }

    if (!isRtl && Hotkeys.isExtendForward(event) || isRtl && Hotkeys.isExtendBackward(event)) {
      event.preventDefault();
      return editor.moveFocusForward();
    }

    next();
  }

  /**
   * On mouse down.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onMouseDown(event, editor, next) {
    debug$1('onMouseDown', { event: event });
    isMouseDown = true;
    next();
  }

  /**
   * On mouse up.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onMouseUp(event, editor, next) {
    debug$1('onMouseUp', { event: event });
    isMouseDown = false;
    next();
  }

  /**
   * On paste.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onPaste(event, editor, next) {
    debug$1('onPaste', { event: event });

    var value = editor.value;

    var transfer = getEventTransfer(event);
    var type = transfer.type,
        fragment = transfer.fragment,
        text = transfer.text;


    if (type === 'fragment') {
      editor.insertFragment(fragment);
    }

    if (type === 'text' || type === 'html') {
      if (!text) return next();
      var document = value.document,
          selection = value.selection,
          startBlock = value.startBlock;

      if (editor.isVoid(startBlock)) return next();

      var defaultBlock = startBlock;
      var defaultMarks = document.getInsertMarksAtRange(selection);
      var frag = Plain.deserialize(text, { defaultBlock: defaultBlock, defaultMarks: defaultMarks }).document;
      editor.insertFragment(frag);
    }

    next();
  }

  /**
   * On select.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onSelect(event, editor, next) {
    debug$1('onSelect', { event: event });
    var domSelection = editor.ownerWindow.getSelection();
    var selection = editor.findSelection(domSelection);
    // prettier-ignore
    if (window.ENABLE_SLATE_LOGGING && domSelection && editor.value.selection.anchor && selection && selection.anchor) console.log('!! onSelect domOffset:' + domSelection.anchorOffset + ' oldSlate: ' + editor.value.selection.anchor.offset + ' newSlate: ' + selection.anchor.offset);

    if (selection) {
      editor.select(selection);
    } else {
      editor.blur();
    }

    // COMPAT: reset the `isMouseDown` state here in case a `mouseup` event
    // happens outside the editor. This is needed for `onFocus` handling.
    isMouseDown = false;

    next();
  }

  /**
   * Return the plugin.
   *
   * @type {Object}
   */

  return {
    onBeforeInput: onBeforeInput,
    onBlur: onBlur,
    onClick: onClick,
    onCopy: onCopy,
    onCut: onCut,
    onDragEnd: onDragEnd,
    onDragStart: onDragStart,
    onDrop: onDrop,
    onFocus: onFocus,
    onInput: onInput,
    onKeyDown: onKeyDown,
    onMouseDown: onMouseDown,
    onMouseUp: onMouseUp,
    onPaste: onPaste,
    onSelect: onSelect
  };
}

/**
 * Find the DOM node for a `key`.
 *
 * @param {String|Node} key
 * @param {Window} win (optional)
 * @return {Element}
 */

function findDOMNode(key) {
  var win = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : window;

  // warning(
  //   false,
  //   'As of slate-react@0.22 the `findDOMNode(key)` helper is deprecated in favor of `editor.findDOMNode(path)`.'
  // )

  if (Node.isNode(key)) {
    key = key.key;
  }

  var el = win.document.querySelector('[' + DATA_ATTRS.KEY + '="' + key + '"]');

  if (!el) {
    throw new Error('Unable to find a DOM node for "' + key + '". This is often because of forgetting to add `props.attributes` to a custom component.');
  }

  return el;
}

/**
 * Debug.
 *
 * @type {Function}
 */

var debug$2 = Debug('slate:before');

/**
 * A plugin that adds the "before" browser-specific logic to the editor.
 *
 * @return {Object}
 */

function BeforePlugin() {
  var activeElement = null;
  var isComposing = false;
  var isCopying = false;
  var isDragging = false;
  var isUserActionPerformed = false;

  var nextNativeOperation = null;
  var currentlySelectedCompositionNode = null;

  /**
   * On before input.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onBeforeInput(event, editor, next) {
    editor.ensureSelection();

    /* prettier-ignore */if (window.ENABLE_SLATE_LOGGING) console.log('!! onBeforeInput with data:' + JSON.stringify(event.data) + ' inputType:' + event.inputType + ' has2:' + HAS_INPUT_EVENTS_LEVEL_2 + ' isSynthetic:' + !!event.nativeEvent);

    // If the user has started a composition for something like a chinese character
    // then wait to modify slate's AST and wait to force a react render until the composition is done.
    if (checkIsComposing()) return;

    var isSynthetic = !!event.nativeEvent;
    if (editor.readOnly) return;
    isUserActionPerformed = true;

    // COMPAT: If the browser supports Input Events Level 2, we will have
    // attached a custom handler for the real `beforeinput` events, instead of
    // allowing React's synthetic polyfill, so we need to ignore synthetics.
    if (isSynthetic && HAS_INPUT_EVENTS_LEVEL_2) return;

    // If the event is synthetic, it's React's polyfill of `beforeinput` that
    // isn't a true `beforeinput` event with meaningful information. It only
    // gets triggered for character insertions, so we can just insert directly.
    // Single character inserts can be handled natively. Allows native rendering
    // which preserves the native browser spell check handling.
    if (isSynthetic) {
      var isCollapsed = editor.value.selection.isCollapsed;

      if (!isCollapsed) {
        editor.delete();
      }

      var inputText = (event.data || '').replace(/\n\r/g, '\n').replace(/\r/g, '\n');
      var hasNewLines = inputText.indexOf('\n') >= 0;

      if (isCollapsed && !hasNewLines) {
        saveCurrentNativeNode(editor);
      } else {
        event.preventDefault();

        if (!hasNewLines) {
          editor.insertText(event.data, null, false);
        } else {
          var chunks = inputText.split('\n');

          chunks.map(function (text, i) {
            if (text.length !== 0) {
              /* prettier-ignore */if (window.ENABLE_SLATE_LOGGING) console.log('    insert: |' + JSON.stringify(text) + '|');
              editor.insertText(text, null, false);
            }

            if (i !== chunks.length - 1) {
              /* prettier-ignore */if (window.ENABLE_SLATE_LOGGING) console.log('    inserting line break');
              editor.splitBlock();
            }
          });
        }
      }
    } else {
      debug$2('onBeforeInput', { event: event });
      next();
    }
  }

  /**
   * On blur.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onBlur(event, editor, next) {
    if (isCopying) return;
    if (editor.readOnly) return;

    var relatedTarget = event.relatedTarget;

    // COMPAT: If the current `activeElement` is still the previous one, this is
    // due to the window being blurred when the tab itself becomes unfocused, so
    // we want to abort early to allow to editor to stay focused when the tab
    // becomes focused again.

    if (activeElement === editor.ownerWindow.document.activeElement) return;

    // COMPAT: The `relatedTarget` can be null when the new focus target is not
    // a "focusable" element (eg. a `<div>` without `tabindex` set).
    if (relatedTarget) {
      var el = editor.findDOMNode([]);

      // COMPAT: The event should be ignored if the focus is returning to the
      // editor from an embedded editable element (eg. an <input> element inside
      // a void node).
      if (relatedTarget === el) return;

      // COMPAT: The event should be ignored if the focus is moving from the
      // editor to inside a void node's spacer element.
      if (relatedTarget.hasAttribute(DATA_ATTRS.SPACER)) return;

      // COMPAT: The event should be ignored if the focus is moving to a non-
      // editable section of an element that isn't a void node (eg. a list item
      // of the check list example).
      var node = editor.findNode(relatedTarget);

      if (el != null && el.contains(relatedTarget) && node && !editor.isVoid(node)) {
        return;
      }
    }

    debug$2('onBlur', { event: event });
    next();
  }

  /**
   * On composition end.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onCompositionEnd(event, editor, next) {
    /* prettier-ignore */if (window.ENABLE_SLATE_LOGGING) console.log('!! onCompositionEnd isComposing:' + isComposing);

    isUserActionPerformed = true;
    isComposing = false;

    // Since we may have skipped some input events during the composition, once it is over
    // we need to manually call flush to sync the dom to the slate AST
    saveCurrentlySelectedCompositionNode(editor);
    saveCurrentNativeNode(editor);
    syncDomToSlateAst(editor);

    debug$2('onCompositionEnd', { event: event });
    next();
  }

  function onCompositionUpdate(event, editor) {
    /* prettier-ignore */if (window.ENABLE_SLATE_LOGGING) console.log('!! onCompositionUpdate isComposing:' + isComposing);
    isComposing = true;
    saveCurrentlySelectedCompositionNode(editor);
  }

  /**
   * On click.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onClick(event, editor, next) {
    debug$2('onClick', { event: event });
    isUserActionPerformed = true;
    next();
  }

  /**
   * On composition start.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onCompositionStart(event, editor, next) {
    editor.ensureSelection();

    /* prettier-ignore */if (window.ENABLE_SLATE_LOGGING) console.log('!! onCompositionStart isComposing:' + isComposing + ' isCollapsed:' + editor.value.selection.isCollapsed);

    isComposing = true;

    var value = editor.value;
    var selection = value.selection;

    isUserActionPerformed = true;

    if (!selection.isCollapsed) {
      // https://github.com/ianstormtaylor/slate/issues/1879
      // When composition starts and the current selection is not collapsed, the
      // second composition key-down would drop the text wrapping <spans> which
      // resulted on crash in content.updateSelection after composition ends
      // (because it cannot find <span> nodes in DOM). This is a workaround that
      // erases selection as soon as composition starts and preventing <spans>
      // to be dropped.
      editor.delete();
    }

    saveCurrentlySelectedCompositionNode(editor);
    saveCurrentNativeNode(editor);

    debug$2('onCompositionStart', { event: event });
    next();
  }

  /**
   * On copy.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onCopy(event, editor, next) {
    isCopying = true;
    editor.ownerWindow.requestAnimationFrame(function () {
      return isCopying = false;
    });

    debug$2('onCopy', { event: event });
    next();
  }

  /**
   * On cut.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onCut(event, editor, next) {
    if (editor.readOnly) return;

    isCopying = true;
    editor.ownerWindow.requestAnimationFrame(function () {
      return isCopying = false;
    });

    debug$2('onCut', { event: event });
    next();
  }

  /**
   * On drag end.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onDragEnd(event, editor, next) {
    isDragging = false;
    debug$2('onDragEnd', { event: event });
    next();
  }

  /**
   * On drag enter.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onDragEnter(event, editor, next) {
    debug$2('onDragEnter', { event: event });
    next();
  }

  /**
   * On drag exit.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onDragExit(event, editor, next) {
    debug$2('onDragExit', { event: event });
    next();
  }

  /**
   * On drag leave.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onDragLeave(event, editor, next) {
    debug$2('onDragLeave', { event: event });
    next();
  }

  /**
   * On drag over.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onDragOver(event, editor, next) {
    // If the target is inside a void node, and only in this case,
    // call `preventDefault` to signal that drops are allowed.
    // When the target is editable, dropping is already allowed by
    // default, and calling `preventDefault` hides the cursor.
    var node = editor.findNode(event.target);

    if (!node || editor.isVoid(node)) {
      event.preventDefault();
    }

    // COMPAT: IE won't call onDrop on contentEditables unless the
    // default dragOver is prevented:
    // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/913982/
    // (2018/07/11)
    if (IS_IE) {
      event.preventDefault();
    }

    // If a drag is already in progress, don't do this again.
    if (!isDragging) {
      isDragging = true;

      // COMPAT: IE will raise an `unspecified error` if dropEffect is
      // set. (2018/07/11)
      if (!IS_IE) {
        event.nativeEvent.dataTransfer.dropEffect = 'move';
      }
    }

    debug$2('onDragOver', { event: event });
    next();
  }

  /**
   * On drag start.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onDragStart(event, editor, next) {
    isDragging = true;
    debug$2('onDragStart', { event: event });
    next();
  }

  /**
   * On drop.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onDrop(event, editor, next) {
    if (editor.readOnly) return;
    isUserActionPerformed = true;

    // Prevent default so the DOM's value isn't corrupted.
    event.preventDefault();

    debug$2('onDrop', { event: event });
    next();
  }

  /**
   * On focus.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onFocus(event, editor, next) {
    if (isCopying) return;
    if (editor.readOnly) return;

    var el = editor.findDOMNode([]);

    // Save the new `activeElement`.
    activeElement = editor.ownerWindow.document.activeElement;

    // COMPAT: If the editor has nested editable elements, the focus can go to
    // those elements. In Firefox, this must be prevented because it results in
    // issues with keyboard navigation. (2017/03/30)
    if (IS_FIREFOX && event != null && el != null && event.target !== el) {
      el.focus();
      return;
    }

    debug$2('onFocus', { event: event });
    next();
  }

  /**
   * On input.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onInput(event, editor, next) {
    editor.ensureSelection();

    /* prettier-ignore */if (window.ENABLE_SLATE_LOGGING) console.log('!! onInput isComposing:' + isComposing + ' hasOp:' + !!nextNativeOperation);

    if (checkIsComposing()) {
      // Safari is broken :(
      if (HAS_INPUT_EVENTS_LEVEL_2) return;

      // During compositions we _have_ to scan the dom to see what has changed, we cannot ever rely on onBeforeInput
      // modifying the AST since that will change the dom text node!
      saveCurrentNativeNode(editor);
      syncDomToSlateAst(editor);
      return;
    }

    // The input event fires after the browser has modified the dom
    // At this point we can read the dom to see what the browser did and import that change into slate's AST
    if (syncDomToSlateAst(editor)) {
      return;
    }

    if (editor.value.selection.isBlurred) return;
    isUserActionPerformed = true;
    debug$2('onInput', { event: event });
    next();
  }

  /**
   * On key down.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onKeyDown(event, editor, next) {
    if (editor.readOnly) return;
    editor.ensureSelection();

    /* prettier-ignore */if (window.ENABLE_SLATE_LOGGING) console.log('!! onKeyDown isComposing:' + isComposing + ' hasOp:' + !!nextNativeOperation + ' mods:' + (event.ctrlKey ? 'ctrl-' : '') + (event.altKey ? 'alt-' : '') + (event.shiftKey ? 'shift-' : '') + (event.metaKey ? 'meta-' : '') + ' key:' + event.key + ' which:' + event.which);

    // When composing, we need to prevent all hotkeys from executing while
    // typing. However, certain characters also move the selection before
    // we're able to handle it, so prevent their default behavior.
    if (checkIsComposing()) {
      if (Hotkeys.isCompose(event)) event.preventDefault();
      return;
    }

    // Optimization: Bail out if none of the keys we care about were pressed!
    if (!event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey && event.key != null) {
      switch (event.key.toLowerCase()) {
        case 'arrowdown':
        case 'arrowleft':
        case 'arrowright':
        case 'arrowup':
        case 'pageup':
        case 'pagedown':
        case 'backspace':
        case 'delete':
        case 'insert':
        case 'home':
        case 'end':
        case 'enter':
        case 'tab':
        case 'space':
          break;

        default:
          return;
      }
    }

    // Certain hotkeys have native editing behaviors in `contenteditable`
    // elements which will editor the DOM and cause our value to be out of sync,
    // so they need to always be prevented.
    if (!IS_IOS && (Hotkeys.isBold(event) || Hotkeys.isDeleteBackward(event) || Hotkeys.isDeleteForward(event) || Hotkeys.isDeleteLineBackward(event) || Hotkeys.isDeleteLineForward(event) || Hotkeys.isDeleteWordBackward(event) || Hotkeys.isDeleteWordForward(event) || Hotkeys.isItalic(event) || Hotkeys.isRedo(event) ||
    // Hotkeys.isSplitBlock(event) ||
    Hotkeys.isTransposeCharacter(event) || Hotkeys.isUndo(event))) {
      event.preventDefault();
    }

    isUserActionPerformed = true;
    debug$2('onKeyDown', { event: event });
    next();
  }

  /**
   * On paste.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onPaste(event, editor, next) {
    if (editor.readOnly) return;
    isUserActionPerformed = true;

    // Prevent defaults so the DOM state isn't corrupted.
    event.preventDefault();

    debug$2('onPaste', { event: event });
    next();
  }

  /**
   * On select.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onSelect(event, editor, next) {
    if (isCopying) return;
    if (editor.readOnly) return;
    if (checkIsComposing() && HAS_INPUT_EVENTS_LEVEL_2) return;

    // Save the new `activeElement`.
    activeElement = editor.ownerWindow.document.activeElement;
    isUserActionPerformed = true;

    debug$2('onSelect', { event: event });
    next();
  }

  function userActionPerformed() {
    return isUserActionPerformed;
  }

  function clearUserActionPerformed() {
    isUserActionPerformed = false;
    return null;
  }

  /**
   * The job of this function is to look at the dom, see what text is there, and sync that text into slate.
   * We use this for things like asian language compositions, auto suggest/correct, and mac's accented character input.
   * Each of these are too complicated to replicate perfectly with the events the browser exposes to us.  Additionally,
   * the browser relies on us not modifying the text node.  If we touch the text node's content in any way, then the
   * browser will abort any composition that it has in progress!  So our goal is to let the browser do its things,
   * avoid touching it or syncing its state at all, and then once it is done, we will sync its state into slate,
   * which is what this function does.
   *
   * A slate AST will look something like this:
   * document: {
   *   nodes: [{
   *     type: 'line',
   *     nodes: [{key: '42', type: 'text', text: '**foo**'}],
   *   ]}
   * }
   *
   * The corresponding dom structure will look something like:
   * <span data-key=42>
   *   <span decoration="syntax">
   *     <span data-string=true>**</span>
   *   </span>
   *   <span decoration="bold">
   *     <span data-string=true>foo</span>
   *   </span>
   *   <span decoration="syntax">
   *     <span data-string=true>**</span>
   *   </span>
   * </span>
   *
   * The important thing to note about the above is that there is a single span tag that corresponds to each Text node
   * in the AST.  Generally speaking, thatSpanNode.textContent === LeaftAstTextNode.text
   *
   * The part where that is not true is zero-width spaces.  Slate needs to force text nodes to be created, and it does
   * this by creating dom nodes that just have a zero width space in them.  The problem with this is the browser doesn't
   * know that we don't want them.  So when a user types "a" to start, they will only see one character, but in the dom
   * there are actually two (because the browser didn't remove the zero-width space).  So, we have to do some surgery
   * on the dom to clean these up and keep them out of the slate AST.
   */

  function syncDomToSlateAst(editor) {
    /* prettier-ignore */if (window.ENABLE_SLATE_LOGGING) console.log('!! syncDomToSlateAst');

    var nodesToIncorporate = nextNativeOperation || [];
    nextNativeOperation = null;

    addCurrentlySelectedKeyNode(editor, nodesToIncorporate);
    if (nodesToIncorporate.length === 0) return false;

    var _editor$ownerWindow$g = editor.ownerWindow.getSelection(),
        textNode = _editor$ownerWindow$g.anchorNode,
        currentOffset = _editor$ownerWindow$g.anchorOffset;
    /* prettier-ignore */

    if (window.ENABLE_SLATE_LOGGING) console.log('    textNode: ' + textNode.textContent + ' ' + textNode.textContent.length);

    // Just in case: Make sure the currently selected node is in the list of nodes we are going to sync

    // Now sync the content of all nodes in the lis tinto our AST
    var failed = false;

    var _loop = function _loop(node) {
      if (sanitizeDomOnError(editor, node, function () {
        return syncNodeToSlateAst(editor, node);
      }).failed) {
        failed = true;
      }
    };

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = nodesToIncorporate[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var node = _step.value;

        _loop(node);
      }

      /* prettier-ignore */
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    if (window.ENABLE_SLATE_LOGGING) console.log('    flush selAfterInsert :', JSON.stringify(editor.value.selection.toJSON()));
    /* prettier-ignore */if (window.ENABLE_SLATE_LOGGING) console.log('    editor: len: ' + editor.value.document.text.length + ' selSlate: ' + editor.value.selection.anchor.offset + ' selNative: ' + currentOffset + ' document: ' + JSON.stringify(editor.value.document.toJSON()));

    // If any of the syncing above failed, then we can't really do much else here, let's just bail out to avoid
    // cascading errors.
    if (failed) return;

    // Finally make sure the browser and slate agree on where your selection should be
    sanitizeDomOnError(editor, textNode, function () {
      return syncSelection(editor, textNode, currentOffset);
    });

    /* prettier-ignore */if (window.ENABLE_SLATE_LOGGING) console.log('    flush selAfterSelect2:', JSON.stringify(editor.value.selection.toJSON()));

    // Last step is more of a sanity thing: Make sure the dom structure and text roughly match what slate things they should!
    // This is normally called in the after plugin, however if we do that there, it will re-sync the selection, which we
    // just did above, which wastes about a millisecond.
    reconcileDOMNode(editor, textNode);
    /* prettier-ignore */if (window.ENABLE_SLATE_LOGGING) console.log('    flush selAfterReconci:', JSON.stringify(editor.value.selection.toJSON()));
    /* prettier-ignore */if (window.ENABLE_SLATE_LOGGING) console.log('    editor: len: ' + editor.value.document.text.length + ' selSlate: ' + editor.value.selection.anchor.offset + ' selNative: ' + editor.ownerWindow.getSelection().anchorOffset + ' document: ' + JSON.stringify(editor.value.document.toJSON()));

    return true;
  }

  function syncNodeToSlateAst(editor, slateDomSpan) {
    // Re-read the slate span from the dom, _just in case_ it has been removed from the dom since!
    var key = slateDomSpan.getAttribute(DATA_ATTRS.KEY);
    slateDomSpan = findDOMNode(key, editor.ownerWindow);

    var path = editor.value.document.getPath(key);
    var slateAstNode = editor.value.document.getNode(key);

    // Strip any zero-width spaces that slate uses internally.  React will clean these up too, but we are trying to
    // avoid having to react-render right now
    sanitizeZeroWidthSpaces(editor, slateDomSpan);

    /* prettier-ignore */if (window.ENABLE_SLATE_LOGGING) console.log('    slateDomSpan: ' + slateDomSpan.textContent + ' ' + slateDomSpan.textContent.length);
    /* prettier-ignore */if (window.ENABLE_SLATE_LOGGING) console.log('    slateAstNode: ' + slateAstNode.text + ' ' + slateAstNode.text.length);
    /* prettier-ignore */if (window.ENABLE_SLATE_LOGGING) console.log('    flush selBeforeInsert:', JSON.stringify(editor.value.selection.toJSON()));
    /* prettier-ignore */if (window.ENABLE_SLATE_LOGGING) console.log('    editor: len: ' + editor.value.document.text.length + ' selSlate: ' + editor.value.selection.anchor.offset + ' selNative: ' + editor.ownerWindow.getSelection().anchorOffset + ' document: ' + JSON.stringify(editor.value.document.toJSON()));

    // Now grab the full current text content of the slate dom node that represents the full slate AST node
    // We do need to strip any zero-width spaces though, since slate uses them for decorations and other things,
    // so they might legitimately need to be in the dom, but should never be in the AST
    var newTextContent = slateDomSpan.textContent.replace(/[\uFEFF\b]/g, '');
    syncTextToAst(editor, slateAstNode, path, newTextContent);
  }

  function syncSelection(editor, textNode, currentOffset) {
    // Now we need to go and update the selection.  First, we modify slate's internal representation of the selection:
    var newSelectionPosition = Math.min(textNode.textContent.length, currentOffset);
    // This maps a dom position to a slate position.  Remember above: A single slate node will have lots of child
    // dom nodes, which means the dom offset is usually going to be much different from what the offset is in the slate
    // AST
    var point = editor.findPoint(textNode, newSelectionPosition);
    if (point == null) throw Error('Unable to translate dom position to slate position!');
    setSlateSelection(editor, point.path, point.key, point.offset);
    /* prettier-ignore */if (window.ENABLE_SLATE_LOGGING) console.log('    flush selAfterSelect1:', JSON.stringify(editor.value.selection.toJSON()));

    // There's a good chance that slate will do nothing with the update above, partly because we have disabled selection
    // updates in some cases.  So, let's also force the browser to move the selection to where we want.
    // (IIRC in some cases slate was also moving the selection back to an old place sometimes, so this fixes that too).
    setDomSelection(editor, textNode, newSelectionPosition);
  }

  /**
   * Intelligently syncs text changes to the slate AST.  If we can determine with confidence that all the user did
   * was insert a single letter or two, then there's a much faster code path we can take.  If we can't determine that,
   * then we'll replace the entire text content of the AST node, _but_ it will take an extra 2-3 ms
   */

  function syncTextToAst(editor, slateAstNode, path, newText) {
    var oldText = slateAstNode.text;
    if (newText === oldText) return;

    var key = slateAstNode.key;

    // Look for the number of characters at the start and end of the two pieces of text that exactly match,
    // position for position.
    var numStartingCharsSame = commonCharactersAtStart(newText, oldText);
    var numEndingCharsSame = commonCharactersAtEnd(newText.substring(numStartingCharsSame), oldText.substring(numStartingCharsSame));

    // Now, if the number of matching characters is the same as the length of the old text, then we know the new
    // text _only_ contains additions, and those additions start where the matching characters at the start stopped.
    if (numStartingCharsSame + numEndingCharsSame !== oldText.length) {
      // There is a deletion somewhere, so let's just replace the whole node's text
      editor.insertTextAtRange(Range.create({
        anchor: { path: path, key: key, offset: 0 },
        focus: { path: path, key: key, offset: slateAstNode.text.length }
      }), newText);
    } else {
      // We are _just_ inserting characters, so we can do a much faster AST operation!
      var insertions = newText.substring(numStartingCharsSame, newText.length - numEndingCharsSame);

      editor.controller.fastInsertText(path, numStartingCharsSame, insertions, null);
    }
  }

  /** Returns the number of continous characters that exactly match, starting at the beginning of the string */

  function commonCharactersAtStart(left, right) {
    for (var i = 0; i < left.length && i < right.length; i++) {
      if (left[i] !== right[i]) return i;
    }
    return Math.min(left.length, right.length);
  }

  /** Returns the number of continous characters that exactly match, starting at the end of the string */

  function commonCharactersAtEnd(left, right) {
    var leftLength = left.length;
    var rightLength = right.length;

    for (var i = 0; i < leftLength && i < rightLength; i++) {
      if (left[leftLength - i - 1] !== right[rightLength - i - 1]) return i;
    }
    return Math.min(leftLength, rightLength);
  }

  /** Syncs a new selection position to slate, but only if slate does not already have that position as its value */

  function setSlateSelection(editor, path, key, offset) {
    var selection = editor.value.selection;


    if (!selection.isCollapsed || selection.anchor.key !== key || selection.anchor.offset !== offset) {
      var point = { path: path, key: key, offset: offset };
      editor.select(Range.create({ anchor: point, focus: point }));
    }
  }

  /** Syncs a new selection position to the dom, but only if the dom does not already have that position */

  function setDomSelection(editor, textNode, offset) {
    var selection = editor.ownerWindow.getSelection();

    if (selection == null || selection.anchorNode !== textNode || selection.focusNode !== textNode || selection.anchorOffset !== offset || selection.focusOffset !== offset) {
      selection.collapse(textNode, offset);
    }
  }

  /**
   * Slate has two dom representations for leaf nodes:
   * <span data-string=true>abc</span>
   * <span data-zero-width=true></span>
   * When a node is first created, it starts as the zero-width dom node.  When we let the browser modify it, we will
   * be left with the zero-width markup, but it now contains more than just a zero-width string.  So, in this case,
   * we want to strip those attributes.
   * Additionally, if a node contains anything more than just a zero width string, then we should remove any zero-width
   * spaces from it if has any.
   */

  function sanitizeZeroWidthSpaces(editor, slateDomSpan) {
    var allChildTextNodes = slateDomSpan.querySelectorAll(SELECTORS.STRING + ', ' + SELECTORS.ZERO_WIDTH);

    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = allChildTextNodes[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var stringNode = _step2.value;

        var isStringNode = stringNode.hasAttribute(DATA_ATTRS.STRING);
        var isZeroWidth = stringNode.hasAttribute(DATA_ATTRS.ZERO_WIDTH);

        // This should basically always be true:
        if (isStringNode || isZeroWidth) {
          var hasZeroWidthChars = stringNode.textContent.indexOf('\uFEFF') >= 0;

          // A string node with any zero width characters needs to be cleaned
          // A zero width node with only a zero width character is ok though:
          if (isStringNode && hasZeroWidthChars || isZeroWidth && stringNode.textContent !== '\uFEFF') {
            /* prettier-ignore */if (window.ENABLE_SLATE_LOGGING) console.log('    REPLACING ' + stringNode.childNodes.length);

            // If there's only a single text node here, then we modify it's dom content directly
            // If there are multiple though, then it's a bit of an unknown situation, so we replace the entire span
            removeZeroWidths(stringNode);

            stringNode.removeAttribute(DATA_ATTRS.ZERO_WIDTH);
            stringNode.removeAttribute(DATA_ATTRS.LENGTH);
          }
        }
      }
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2.return) {
          _iterator2.return();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }
  }

  function removeZeroWidths(parent) {
    eachTextNode(parent, function (textNode) {
      while (true) {
        var pos = textNode.textContent.indexOf('\uFEFF');
        if (pos === -1) break;
        textNode.deleteData(pos, 1);
      }
    });
  }

  function eachTextNode(node, cb) {
    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
      for (var _iterator3 = node.childNodes[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
        var child = _step3.value;

        if (child.nodeType === 1) {
          eachTextNode(child, cb);
        } else if (child.nodeType === 3) {
          cb(child);
        }
      }
    } catch (err) {
      _didIteratorError3 = true;
      _iteratorError3 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion3 && _iterator3.return) {
          _iterator3.return();
        }
      } finally {
        if (_didIteratorError3) {
          throw _iteratorError3;
        }
      }
    }
  }

  function saveCurrentNativeNode(editor) {
    if (!nextNativeOperation) {
      nextNativeOperation = [];
    }

    addCurrentlySelectedKeyNode(editor, nextNativeOperation);
  }

  function saveCurrentlySelectedCompositionNode(editor) {
    var selection = editor.ownerWindow.getSelection();

    currentlySelectedCompositionNode = selection == null ? null : selection.anchorNode;
  }

  function checkIsComposing() {
    // If React has come through and re-rendered the dom, then it may have interrupted a composition, and there
    // may not have been an onCompositionEnd event.  So if the node that was last selected during the composition
    // no longer exists in the dom, let's assume the user aborted the composition.
    if (isComposing) {
      if (currentlySelectedCompositionNode == null) isComposing = false;

      var doc = currentlySelectedCompositionNode.ownerDocument;

      if (!doc.body.contains(currentlySelectedCompositionNode)) {
        console.warn('Aborting composition because previously selection node is no longer in the dom!');

        isComposing = false;
      }
    }

    return isComposing;
  }

  function addCurrentlySelectedKeyNode(editor, keyNodes) {
    // The node with a data-key property entirely encompasses a single slate AST text node.
    // It'll have lots of children for the various decorations, but its entire textContent should map
    // to a single AST node
    var currentSpan = safelyGetParentKeyNode(editor.ownerWindow.getSelection().anchorNode);

    // Save a reference to the currently selected AST node
    // Once the browser has modified the dom, we'll use these to figure out what changes were made
    if (keyNodes.indexOf(currentSpan) === -1) {
      keyNodes.push(currentSpan);
    }
  }

  /**
   * Return the plugin.
   *
   * @type {Object}
   */

  return {
    onBeforeInput: onBeforeInput,
    onBlur: onBlur,
    onClick: onClick,
    onCompositionEnd: onCompositionEnd,
    onCompositionUpdate: onCompositionUpdate,
    onCompositionStart: onCompositionStart,
    onCopy: onCopy,
    onCut: onCut,
    onDragEnd: onDragEnd,
    onDragEnter: onDragEnter,
    onDragExit: onDragExit,
    onDragLeave: onDragLeave,
    onDragOver: onDragOver,
    onDragStart: onDragStart,
    onDrop: onDrop,
    onFocus: onFocus,
    onInput: onInput,
    onKeyDown: onKeyDown,
    onPaste: onPaste,
    onSelect: onSelect,
    queries: {
      userActionPerformed: userActionPerformed,
      isComposing: checkIsComposing
    },
    commands: {
      clearUserActionPerformed: clearUserActionPerformed
    }
  };
}

/**
 * A plugin that adds the browser-specific logic to the editor.
 *
 * @param {Object} options
 * @return {Object}
 */

function DOMPlugin() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var _options$plugins = options.plugins,
      plugins = _options$plugins === undefined ? [] : _options$plugins;

  return [BeforePlugin()].concat(toConsumableArray(plugins), [AfterPlugin()]);
}

function RestoreDOMPlugin() {
  /**
   * Makes sure that on the next Content `render` the DOM is restored.
   * This gets us around issues where the DOM is in a different state than
   * React's virtual DOM and would crash.
   *
   * @param {Editor} editor
   */

  function restoreDOM(editor) {
    var tmp = editor.tmp.contentRef.current.tmp;
    tmp.contentKey = tmp.contentKey + 1;
  }

  return {
    commands: {
      restoreDOM: restoreDOM
    }
  };
}

/**
 * Takes a React Synthetic Event or a DOM Event and turns it into a String that
 * is easy to log. It's succinct and keeps info to a bare minimum.
 *
 * @param {Event} event
 */

function stringifyEvent(event) {
  var e = event.nativeEvent || event;

  switch (e.type) {
    case 'keydown':
      return e.type + ' ' + JSON.stringify(e.key);
    case 'input':
    case 'beforeinput':
    case 'textInput':
      return e.type + ':' + e.inputType + ' ' + JSON.stringify(e.data);
    default:
      return e.type;
  }
}

/**
 * Debug events function.
 *
 * @type {Function}
 */

var debug$3 = Debug('slate:events');

/**
 * A plugin that sends short easy to digest debug info about each event to
 * browser.
 *
 * @return {Object}
 */

function DebugEventsPlugin() {
  /**
   * Plugin Object
   *
   * @type {Object}
   */

  var plugin = {};

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = EVENT_HANDLERS[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var eventName = _step.value;

      plugin[eventName] = function (event, editor, next) {
        var s = stringifyEvent(event);
        debug$3(s);
        next();
      };
    }

    /**
     * Return the plugin.
     *
     * @type {Object}
     */
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return plugin;
}

/**
 * Constants
 */

var INTERVAL = 2000;

/**
 * Debug events function.
 *
 * @type {Function}
 */

var debug$4 = Debug('slate:batch-events');

/**
 * A plugin that sends short easy to digest debug info about each event to
 * browser.
 *
 * @return {Object}
 */

function DebugBatchEventsPlugin() {
  /**
   * When the batch started
   *
   * @type {Date}
   */

  var startDate = null;

  /**
   * The timeoutId used to cancel the timeout
   *
   * @type {Any}
   */

  var timeoutId = null;

  /**
   * An array of events not yet dumped with `debug`
   *
   * @type {Array}
   */

  var events = [];

  /**
   * Send all events to debug
   *
   * Note: Formatted so it can easily be cut and pasted as text for analysis or
   * documentation.
   */

  function dumpEvents() {
    debug$4('\n' + events.join('\n'));
    events.length = 0;
  }

  /**
   * Push an event on to the Array of events for debugging in a batch
   *
   * @param {Event} event
   */

  function pushEvent(event) {
    if (events.length === 0) {
      startDate = new Date();
    }

    var s = stringifyEvent(event);
    var now = new Date();
    events.push('- ' + (now - startDate) + ' - ' + s);
    clearTimeout(timeoutId);
    timeoutId = setTimeout(dumpEvents, INTERVAL);
  }

  /**
   * Plugin Object
   *
   * @type {Object}
   */

  var plugin = {};

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = EVENT_HANDLERS[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var eventName = _step.value;

      plugin[eventName] = function (event, editor, next) {
        pushEvent(event);
        next();
      };
    }

    /**
     * Return the plugin.
     *
     * @type {Object}
     */
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return plugin;
}

/**
 * Debug mutations function.
 *
 * @type {Function}
 */

var debug$5 = Debug('slate:mutations');

/**
 * Properties on a MutationRecord
 *
 * @type {Object}
 */

var MUTATION_PROPERTIES = ['type', 'oldValue', 'target', 'addedNodes', 'removedNodes', 'attributeName', 'attributeNamespace', 'nextSibling', 'previousSibling'];

/**
 * Takes a DOM node and returns an easily readable version of it.
 *
 * @param {DOMNode} node
 */

function normalizeNode(node) {
  if (node.nodeType === window.Node.TEXT_NODE) {
    return node.textContent;
  } else if (node.nodeType === window.Node.ELEMENT_NODE) {
    var outerHTML = node.outerHTML,
        innerHTML = node.innerHTML;

    if (outerHTML == null) return JSON.stringify(node.textContent);
    return outerHTML.slice(0, outerHTML.indexOf(innerHTML));
  } else {
    return 'Node(type=' + node.nodeType;
  }
}

/**
 * A plugin that sends short easy to digest debug info about each dom mutation
 * to browser.
 *
 * More information about mutations here:
 *
 * <https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver>
 * <https://developer.mozilla.org/en-US/docs/Web/API/MutationRecord>
 *
 * @param {Object} options
 */

function DebugMutationsPlugin() {
  var observer = new window.MutationObserver(function (mutations) {
    var array = Array.from(mutations).map(function (mutationRecord) {
      var object = {};

      // Only add properties that provide meaningful values to the object
      // to make the debug info easier to read
      MUTATION_PROPERTIES.forEach(function (key) {
        var value = mutationRecord[key];
        if (value == null) return;

        // Make NodeList easier to read
        if (value instanceof window.NodeList) {
          if (value.length === 0) return;

          object[key] = Array.from(value).map(normalizeNode).join(', ');
          return;
        }

        // Make Node easier to read
        if (value instanceof window.Node) {
          value = normalizeNode(value);
        }

        object[key] = value;
      });

      return object;
    });

    // The first argument must not be the array as `debug` renders the first
    // argument in a different way than the rest
    debug$5.apply(undefined, [array.length + ' Mutations'].concat(toConsumableArray(array)));
  });

  /**
   * The previously observed DOM node
   *
   * @type {DOMNode}
   */

  var prevRootEl = null;

  /**
   * Start observing the DOM node for mutations if it isn't being observed
   */

  function start(event, editor, next) {
    var rootEl = editor.findDOMNode([]);

    if (rootEl === prevRootEl) return next();

    debug$5('start');

    observer.observe(rootEl, {
      childList: true,
      characterData: true,
      attributes: true,
      subtree: true,
      characterDataOldValue: true
    });

    prevRootEl = rootEl;

    next();
  }

  /**
   * Stop observing the DOM node for mutations
   */

  function stop(event, editor, next) {
    debug$5('stop');

    observer.disconnect();
    prevRootEl = null;
    next();
  }

  return {
    onComponentDidMount: start,
    onComponentDidUpdate: start,
    onComponentWillUnmount: stop
  };
}

/**
 * A plugin that adds the React-specific rendering logic to the editor.
 *
 * @param {Object} options
 * @return {Object}
 */

function ReactPlugin() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var _options$placeholder = options.placeholder,
      placeholder = _options$placeholder === undefined ? '' : _options$placeholder;

  var debugEventsPlugin = Debug.enabled('slate:events') ? DebugEventsPlugin(options) : null;
  var debugBatchEventsPlugin = Debug.enabled('slate:batch-events') ? DebugBatchEventsPlugin(options) : null;
  var debugMutationsPlugin = Debug.enabled('slate:mutations') ? DebugMutationsPlugin(options) : null;
  var renderingPlugin = Rendering(options);
  var commandsPlugin = CommandsPlugin(options);
  var queriesPlugin = QueriesPlugin(options);
  var editorPropsPlugin = EditorPropsPlugin(options);
  var domPlugin = DOMPlugin(options);
  var restoreDomPlugin = RestoreDOMPlugin();

  // Disable placeholder for Android because it messes with reconciliation
  // and doesn't disappear until composition is complete.
  // e.g. In empty, type "h" and autocomplete on Android 9 and deletes all text.
  var placeholderPlugin = IS_ANDROID || placeholder === null ? null : PlaceholderPlugin({
    placeholder: placeholder,
    when: function when(editor, node) {
      return node.object === 'document' && node.text === '' && node.nodes.size === 1 && Array.from(node.texts()).length === 1;
    }
  });

  return [debugEventsPlugin, debugBatchEventsPlugin, debugMutationsPlugin, editorPropsPlugin, domPlugin, restoreDomPlugin, placeholderPlugin, renderingPlugin, commandsPlugin, queriesPlugin];
}

/**
 * Debug.
 *
 * @type {Function}
 */

var debug$6 = Debug('slate:editor');

/**
 * Editor.
 *
 * @type {Component}
 */

var Editor$1 = function (_React$Component) {
  inherits(Editor$$1, _React$Component);

  function Editor$$1() {
    var _ref;

    var _temp, _this, _ret;

    classCallCheck(this, Editor$$1);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = possibleConstructorReturn(this, (_ref = Editor$$1.__proto__ || Object.getPrototypeOf(Editor$$1)).call.apply(_ref, [this].concat(args))), _this), _this.state = { value: _this.props.defaultValue, contentKey: 0

      /**
       * Temporary values.
       *
       * @type {Object}
       */

    }, _this.tmp = {
      mounted: false,
      change: null,
      resolves: 0,
      updates: 0,
      contentRef: React.createRef()

      /**
       * When the component first mounts, flush a queued change if one exists.
       */

    }, _this.resolveController = memoizeOne(function () {
      var TheReactPlugin = arguments[5];

      // If we've resolved a few times already, and it's exactly in line with
      // the updates, then warn the user that they may be doing something wrong.
      warning(_this.tmp.resolves < 5 || _this.tmp.resolves !== _this.tmp.updates, 'A Slate <Editor> component is re-resolving the `plugins`, `schema`, `commands`, `queries` or `placeholder` prop on each update, which leads to poor performance. This is often due to passing in a new references for these props with each render by declaring them inline in your render function. Do not do this! Declare them outside your render function, or memoize them instead.');

      _this.tmp.resolves++;
      var react = TheReactPlugin(_extends({}, _this.props, {
        editor: _this,
        value: _this.props.value || _this.state.value
      }));

      var onChange = function onChange(change) {
        if (_this.tmp.mounted) {
          _this.handleChange(change);
        } else {
          _this.tmp.change = change;
        }
      };

      _this.controller = new Editor({ plugins: [react], onChange: onChange }, { controller: _this, construct: false });

      _this.controller.run('onConstruct');
    }), _temp), possibleConstructorReturn(_this, _ret);
  }
  /**
   * Property types.
   *
   * @type {Object}
   */

  /**
   * Default properties.
   *
   * @type {Object}
   */

  /**
   * Initial state.
   *
   * @type {Object}
   */

  createClass(Editor$$1, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.tmp.mounted = true;
      this.tmp.updates++;

      if (this.props.autoFocus) {
        this.focus();
      }

      if (this.tmp.change) {
        this.handleChange(this.tmp.change);
        this.tmp.change = null;
      }
    }

    /**
     * When the component updates, flush a queued change if one exists.
     */

  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate() {
      this.tmp.updates++;

      if (this.tmp.change) {
        this.handleChange(this.tmp.change);
        this.tmp.change = null;
      }
    }

    /**
     * When the component unmounts, make sure async commands don't trigger react updates.
     */

  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      this.tmp.mounted = false;
    }

    /**
     * Render the editor.
     *
     * @return {Element}
     */

  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      debug$6('render', this);

      // Re-resolve the controller if needed based on memoized props.
      var _props = this.props,
          commands = _props.commands,
          placeholder = _props.placeholder,
          plugins = _props.plugins,
          queries = _props.queries,
          schema = _props.schema;


      this.resolveController(plugins, schema, commands, queries, placeholder, ReactPlugin);

      // Set the current props on the controller.
      var _props2 = this.props,
          options = _props2.options,
          readOnly = _props2.readOnly,
          valueFromProps = _props2.value;
      var valueFromState = this.state.value;

      var value = valueFromProps || valueFromState;
      var contentKey = this.state.contentKey;

      this.controller.setReadOnly(readOnly);
      this.controller.setValue(value, options);

      var _props3 = this.props,
          autoCorrect = _props3.autoCorrect,
          className = _props3.className,
          id = _props3.id,
          role = _props3.role,
          spellCheck = _props3.spellCheck,
          tabIndex = _props3.tabIndex,
          style = _props3.style,
          tagName = _props3.tagName,
          onContextMenu = _props3.onContextMenu;


      var domProps = omit(this.props, Object.keys(Editor$$1.__propTypes));

      var children = React.createElement(Content, _extends({}, domProps, {
        ref: this.tmp.contentRef,
        autoCorrect: autoCorrect,
        className: className,
        contentKey: contentKey,
        editor: this,
        id: id,
        onContextMenu: onContextMenu,
        onEvent: function onEvent(handler, event) {
          return _this2.run(handler, event);
        },
        readOnly: readOnly,
        role: role,
        spellCheck: spellCheck,
        style: style,
        tabIndex: tabIndex,
        tagName: tagName
      }));

      // Render the editor's children with the controller.
      var element = this.controller.run('renderEditor', _extends({}, this.props, {
        editor: this,
        children: children
      }));

      return element;
    }

    /**
     * Resolve an editor controller from the passed-in props. This method takes
     * all of the props as individual arguments to be able to properly memoize
     * against anything that could change and invalidate the old editor.
     *
     * @param {Array} plugins
     * @param {Object} schema
     * @param {Object} commands
     * @param {Object} queries
     * @param {String} placeholder
     * @return {Editor}
     */

  }, {
    key: 'handleChange',
    value: function handleChange(change) {
      var onChange = this.props.onChange;
      var value = this.state.value;


      if (value) {
        // Syncing value inside this component since parent does not want control of it (defaultValue was used)
        this.setState({ value: change.value });
      }

      onChange(change);
    }

    /**
     * Mimic the API of the `Editor` controller, so that this component instance
     * can be passed in its place to plugins.
     */

  }, {
    key: 'applyOperation',
    value: function applyOperation() {
      var _controller;

      return (_controller = this.controller).applyOperation.apply(_controller, arguments);
    }
  }, {
    key: 'command',
    value: function command() {
      var _controller2;

      return (_controller2 = this.controller).command.apply(_controller2, arguments);
    }
  }, {
    key: 'hasCommand',
    value: function hasCommand() {
      var _controller3;

      return (_controller3 = this.controller).hasCommand.apply(_controller3, arguments);
    }
  }, {
    key: 'hasQuery',
    value: function hasQuery() {
      var _controller4;

      return (_controller4 = this.controller).hasQuery.apply(_controller4, arguments);
    }
  }, {
    key: 'normalize',
    value: function normalize() {
      var _controller5;

      return (_controller5 = this.controller).normalize.apply(_controller5, arguments);
    }
  }, {
    key: 'query',
    value: function query() {
      var _controller6;

      return (_controller6 = this.controller).query.apply(_controller6, arguments);
    }
  }, {
    key: 'registerCommand',
    value: function registerCommand() {
      var _controller7;

      return (_controller7 = this.controller).registerCommand.apply(_controller7, arguments);
    }
  }, {
    key: 'registerQuery',
    value: function registerQuery() {
      var _controller8;

      return (_controller8 = this.controller).registerQuery.apply(_controller8, arguments);
    }
  }, {
    key: 'run',
    value: function run() {
      var _controller9;

      return (_controller9 = this.controller).run.apply(_controller9, arguments);
    }
  }, {
    key: 'withoutNormalizing',
    value: function withoutNormalizing() {
      var _controller10;

      return (_controller10 = this.controller).withoutNormalizing.apply(_controller10, arguments);
    }

    /**
     * Deprecated.
     */

  }, {
    key: 'call',
    value: function call() {
      var _controller11;

      return (_controller11 = this.controller).call.apply(_controller11, arguments);
    }
  }, {
    key: 'change',
    value: function change() {
      var _controller12;

      return (_controller12 = this.controller).change.apply(_controller12, arguments);
    }
  }, {
    key: 'onChange',
    value: function onChange() {
      var _controller13;

      return (_controller13 = this.controller).onChange.apply(_controller13, arguments);
    }
  }, {
    key: 'applyOperations',
    value: function applyOperations() {
      var _controller14;

      return (_controller14 = this.controller).applyOperations.apply(_controller14, arguments);
    }
  }, {
    key: 'setOperationFlag',
    value: function setOperationFlag() {
      var _controller15;

      return (_controller15 = this.controller).setOperationFlag.apply(_controller15, arguments);
    }
  }, {
    key: 'getFlag',
    value: function getFlag() {
      var _controller16;

      return (_controller16 = this.controller).getFlag.apply(_controller16, arguments);
    }
  }, {
    key: 'unsetOperationFlag',
    value: function unsetOperationFlag() {
      var _controller17;

      return (_controller17 = this.controller).unsetOperationFlag.apply(_controller17, arguments);
    }
  }, {
    key: 'withoutNormalization',
    value: function withoutNormalization() {
      var _controller18;

      return (_controller18 = this.controller).withoutNormalization.apply(_controller18, arguments);
    }
  }, {
    key: 'operations',
    get: function get$$1() {
      return this.controller.operations;
    }
  }, {
    key: 'readOnly',
    get: function get$$1() {
      return this.controller.readOnly;
    }
  }, {
    key: 'value',
    get: function get$$1() {
      return this.controller.value;
    }
  }, {
    key: 'editor',
    get: function get$$1() {
      return this.controller.editor;
    }
  }, {
    key: 'schema',
    get: function get$$1() {
      invariant(false, 'As of Slate 0.42, the `editor.schema` property no longer exists, and its functionality has been folded into the editor itself. Use the `editor` instead.');
    }
  }, {
    key: 'stack',
    get: function get$$1() {
      invariant(false, 'As of Slate 0.42, the `editor.stack` property no longer exists, and its functionality has been folded into the editor itself. Use the `editor` instead.');
    }
  }]);
  return Editor$$1;
}(React.Component);

/**
 * Export.
 *
 * @type {Component}
 */

Editor$1.__propTypes = _extends({
  autoCorrect: Types.bool,
  autoFocus: Types.bool,
  className: Types.string,
  defaultValue: SlateTypes.value,
  id: Types.string,
  onChange: Types.func,
  onContextMenu: Types.func,
  options: Types.object,
  placeholder: Types.any,
  plugins: Types.array,
  readOnly: Types.bool,
  role: Types.string,
  schema: Types.object,
  spellCheck: Types.bool,
  style: Types.object,
  tabIndex: Types.number,
  value: SlateTypes.value
}, EVENT_HANDLERS.reduce(function (obj, handler) {
  obj[handler] = Types.func;
  return obj;
}, {}), OTHER_HANDLERS.reduce(function (obj, handler) {
  obj[handler] = Types.func;
  return obj;
}, {}));
Editor$1.defaultProps = {
  autoFocus: false,
  autoCorrect: true,
  onChange: function onChange() {},
  options: {},
  placeholder: '',
  plugins: [],
  readOnly: false,
  schema: {},
  spellCheck: true };

/**
 * Find a native DOM selection point from a Slate `point`.
 *
 * @param {Point} point
 * @param {Window} win (optional)
 * @return {Object|Null}
 */

function findDOMPoint(point) {
  var win = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : window;

  warning(false, 'As of slate-react@0.22 the `findDOMPoint(point)` helper is deprecated in favor of `editor.findDOMPoint(point)`.');

  var el = findDOMNode(point.key, win);
  var start = 0;

  // For each leaf, we need to isolate its content, which means filtering to its
  // direct text and zero-width spans. (We have to filter out any other siblings
  // that may have been rendered alongside them.)
  var texts = Array.from(el.querySelectorAll(SELECTORS.STRING + ', ' + SELECTORS.ZERO_WIDTH));

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = texts[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var text = _step.value;

      var node = text.childNodes[0];
      var domLength = node.textContent.length;
      var slateLength = domLength;

      if (text.hasAttribute(DATA_ATTRS.LENGTH)) {
        slateLength = parseInt(text.getAttribute(DATA_ATTRS.LENGTH), 10);
      }

      var end = start + slateLength;

      if (point.offset <= end) {
        var offset = Math.min(domLength, Math.max(0, point.offset - start));
        return { node: node, offset: offset };
      }

      start = end;
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return null;
}

/**
 * Find a native DOM range Slate `range`.
 *
 * @param {Range} range
 * @param {Window} win (optional)
 * @return {Object|Null}
 */

function findDOMRange(range) {
  var win = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : window;

  warning(false, 'As of slate-react@0.22 the `findDOMRange(range)` helper is deprecated in favor of `editor.findDOMRange(range)`.');

  var anchor = range.anchor,
      focus = range.focus,
      isBackward$$1 = range.isBackward,
      isCollapsed = range.isCollapsed;

  var domAnchor = findDOMPoint(anchor, win);
  var domFocus = isCollapsed ? domAnchor : findDOMPoint(focus, win);

  if (!domAnchor || !domFocus) return null;

  var r = win.document.createRange();
  var start = isBackward$$1 ? domFocus : domAnchor;
  var end = isBackward$$1 ? domAnchor : domFocus;
  r.setStart(start.node, start.offset);
  r.setEnd(end.node, end.offset);
  return r;
}

/**
 * Find a Slate node from a DOM `element`.
 *
 * @param {Element} element
 * @param {Editor} editor
 * @return {Node|Null}
 */

function findNode(element, editor) {
  warning(false, 'As of slate-react@0.22 the `findNode(element)` helper is deprecated in favor of `editor.findNode(element)`.');

  invariant(!Value.isValue(editor), 'As of Slate 0.42.0, the `findNode` utility takes an `editor` instead of a `value`.');

  var closest = element.closest(SELECTORS.KEY);
  if (!closest) return null;

  var key = closest.getAttribute(DATA_ATTRS.KEY);
  if (!key) return null;

  var value = editor.value;
  var document = value.document;

  var node = document.getNode(key);
  return node || null;
}

/**
 * Find a Slate path from a DOM `element`.
 *
 * @param {Element} element
 * @param {Editor} editor
 * @return {List|Null}
 */

function findPath(element, editor) {
  warning(false, 'As of slate-react@0.22 the `findPath(element)` helper is deprecated in favor of `editor.findPath(element)`.');

  var node = findNode(element, editor);

  if (!node) {
    return null;
  }

  var value = editor.value;
  var document = value.document;

  var path = document.getPath(node);
  return path;
}

/**
 * Find a Slate point from a DOM selection's `nativeNode` and `nativeOffset`.
 *
 * @param {Element} nativeNode
 * @param {Number} nativeOffset
 * @param {Editor} editor
 * @return {Point}
 */

function findPoint(nativeNode, nativeOffset, editor) {
  warning(false, 'As of slate-react@0.22 the `findPoint(node, offset)` helper is deprecated in favor of `editor.findPoint(node, offset)`.');

  invariant(!Value.isValue(editor), 'As of Slate 0.42.0, the `findPoint` utility takes an `editor` instead of a `value`.');

  var _normalizeNodeAndOffs = normalizeNodeAndOffset$1(nativeNode, nativeOffset),
      nearestNode = _normalizeNodeAndOffs.node,
      nearestOffset = _normalizeNodeAndOffs.offset;

  var parentNode = nearestNode.parentNode;

  var rangeNode = parentNode.closest(SELECTORS.LEAF);
  var offset = void 0;
  var node = void 0;

  // Calculate how far into the text node the `nearestNode` is, so that we can
  // determine what the offset relative to the text node is.
  if (rangeNode) {
    var range = editor.ownerWindow.document.createRange();
    var textNode = rangeNode.closest(SELECTORS.TEXT);
    range.setStart(textNode, 0);
    range.setEnd(nearestNode, nearestOffset);
    node = textNode;

    // COMPAT: Edge has a bug where Range.prototype.toString() will convert \n
    // into \r\n. The bug causes a loop when slate-react attempts to reposition
    // its cursor to match the native position. Use textContent.length instead.
    // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/10291116/
    var fragment = range.cloneContents();
    var zeroWidthNodes = fragment.querySelectorAll('[' + DATA_ATTRS.ZERO_WIDTH + ']');
    offset = fragment.textContent.length - zeroWidthNodes.length;
  } else {
    // For void nodes, the element with the offset key will be a cousin, not an
    // ancestor, so find it by going down from the nearest void parent.
    var voidNode = parentNode.closest(SELECTORS.VOID);
    if (!voidNode) return null;
    rangeNode = voidNode.querySelector(SELECTORS.LEAF);
    if (!rangeNode) return null;
    node = rangeNode;
    offset = node.textContent.length;
  }

  // COMPAT: If the parent node is a Slate zero-width space, this is because the
  // text node should have no characters. However, during IME composition the
  // ASCII characters will be prepended to the zero-width space, so subtract 1
  // from the offset to account for the zero-width space character.
  if (offset === node.textContent.length && parentNode.hasAttribute(DATA_ATTRS.ZERO_WIDTH)) {
    offset--;
  }

  // Get the string value of the offset key attribute.
  var offsetKey = rangeNode.getAttribute(DATA_ATTRS.OFFSET_KEY);
  if (!offsetKey) return null;

  var _OffsetKey$parse = OffsetKey.parse(offsetKey),
      key = _OffsetKey$parse.key;

  // COMPAT: If someone is clicking from one Slate editor into another, the
  // select event fires twice, once for the old editor's `element` first, and
  // then afterwards for the correct `element`. (2017/03/03)


  var value = editor.value;

  if (!value.document.hasDescendant(key)) return null;

  var point = value.document.createPoint({ key: key, offset: offset });
  return point;
}

/**
 * From a DOM selection's `node` and `offset`, normalize so that it always
 * refers to a text node.
 *
 * @param {Element} node
 * @param {Number} offset
 * @return {Object}
 */

function normalizeNodeAndOffset$1(node, offset) {
  // If it's an element node, its offset refers to the index of its children
  // including comment nodes, so try to find the right text child node.
  if (node.nodeType === 1 && node.childNodes.length) {
    var isLast = offset === node.childNodes.length;
    var direction = isLast ? 'backward' : 'forward';
    var index = isLast ? offset - 1 : offset;
    node = getEditableChild$1(node, index, direction);

    // If the node has children, traverse until we have a leaf node. Leaf nodes
    // can be either text nodes, or other void DOM nodes.
    while (node.nodeType === 1 && node.childNodes.length) {
      var i = isLast ? node.childNodes.length - 1 : 0;
      node = getEditableChild$1(node, i, direction);
    }

    // Determine the new offset inside the text node.
    offset = isLast ? node.textContent.length : 0;
  }

  // Return the node and offset.
  return { node: node, offset: offset };
}

/**
 * Get the nearest editable child at `index` in a `parent`, preferring
 * `direction`.
 *
 * @param {Element} parent
 * @param {Number} index
 * @param {String} direction ('forward' or 'backward')
 * @return {Element|Null}
 */

function getEditableChild$1(parent, index, direction) {
  var childNodes = parent.childNodes;

  var child = childNodes[index];
  var i = index;
  var triedForward = false;
  var triedBackward = false;

  // While the child is a comment node, or an element node with no children,
  // keep iterating to find a sibling non-void, non-comment node.
  while (child.nodeType === 8 || child.nodeType === 1 && child.childNodes.length === 0 || child.nodeType === 1 && child.getAttribute('contenteditable') === 'false') {
    if (triedForward && triedBackward) break;

    if (i >= childNodes.length) {
      triedForward = true;
      i = index - 1;
      direction = 'backward';
      continue;
    }

    if (i < 0) {
      triedBackward = true;
      i = index + 1;
      direction = 'forward';
      continue;
    }

    child = childNodes[i];
    if (direction === 'forward') i++;
    if (direction === 'backward') i--;
  }

  return child || null;
}

/**
 * Find a Slate range from a DOM `native` selection.
 *
 * @param {Selection} native
 * @param {Editor} editor
 * @return {Range}
 */

function findRange(native, editor) {
  warning(false, 'As of slate-react@0.22 the `findRange(selection)` helper is deprecated in favor of `editor.findRange(selection)`.');

  invariant(!Value.isValue(editor), 'As of Slate 0.42.0, the `findNode` utility takes an `editor` instead of a `value`.');

  var el = native.anchorNode || native.startContainer;
  if (!el) return null;

  // If the `native` object is a DOM `Range` or `StaticRange` object, change it
  // into something that looks like a DOM `Selection` instead.
  if (native instanceof editor.ownerWindow.Range || editor.ownerWindow.StaticRange && native instanceof editor.ownerWindow.StaticRange) {
    native = {
      anchorNode: native.startContainer,
      anchorOffset: native.startOffset,
      focusNode: native.endContainer,
      focusOffset: native.endOffset
    };
  }

  var _native = native,
      anchorNode = _native.anchorNode,
      anchorOffset = _native.anchorOffset,
      focusNode = _native.focusNode,
      focusOffset = _native.focusOffset,
      isCollapsed = _native.isCollapsed;
  var value = editor.value;

  var anchor = findPoint(anchorNode, anchorOffset, editor);
  var focus = isCollapsed ? anchor : findPoint(focusNode, focusOffset, editor);
  if (!anchor || !focus) return null;

  var document = value.document;

  var range = document.createRange({
    anchor: anchor,
    focus: focus
  });

  return range;
}

/**
 * Get the target range from a DOM `event`.
 *
 * @param {Event} event
 * @param {Editor} editor
 * @return {Range}
 */

function getEventRange(event, editor) {
  warning(false, 'As of slate-react@0.22 the `getEventRange(event, editor)` helper is deprecated in favor of `editor.findEventRange(event)`.');

  invariant(!Value.isValue(editor), 'As of Slate 0.42.0, the `findNode` utility takes an `editor` instead of a `value`.');

  if (event.nativeEvent) {
    event = event.nativeEvent;
  }

  var _event = event,
      x = _event.clientX,
      y = _event.clientY,
      target = _event.target;

  if (x == null || y == null) return null;

  var value = editor.value;
  var document = value.document;

  var path = findPath(event.target, editor);
  if (!path) return null;

  var node = document.getNode(path);

  // If the drop target is inside a void node, move it into either the next or
  // previous node, depending on which side the `x` and `y` coordinates are
  // closest to.
  if (editor.isVoid(node)) {
    var rect = target.getBoundingClientRect();
    var isPrevious = node.object === 'inline' ? x - rect.left < rect.left + rect.width - x : y - rect.top < rect.top + rect.height - y;

    var _range = document.createRange();
    var move = isPrevious ? 'moveToEndOfNode' : 'moveToStartOfNode';
    var entry = document[isPrevious ? 'getPreviousText' : 'getNextText'](path);

    if (entry) {
      return _range[move](entry);
    }

    return null;
  }

  // Else resolve a range from the caret position where the drop occured.
  var doc = editor.ownerWindow.document;
  var native = void 0;

  // COMPAT: In Firefox, `caretRangeFromPoint` doesn't exist. (2016/07/25)
  if (doc.caretRangeFromPoint) {
    native = doc.caretRangeFromPoint(x, y);
  } else if (doc.caretPositionFromPoint) {
    var position = doc.caretPositionFromPoint(x, y);
    native = doc.createRange();
    native.setStart(position.offsetNode, position.offset);
    native.setEnd(position.offsetNode, position.offset);
  } else if (doc.body.createTextRange) {
    // COMPAT: In IE, `caretRangeFromPoint` and
    // `caretPositionFromPoint` don't exist. (2018/07/11)
    native = doc.body.createTextRange();

    try {
      native.moveToPoint(x, y);
    } catch (error) {
      // IE11 will raise an `unspecified error` if `moveToPoint` is
      // called during a dropEvent.
      return null;
    }
  }

  // Resolve a Slate range from the DOM range.
  var range = findRange(native, editor);
  if (!range) return null;

  return range;
}

var index = {
  Editor: Editor$1,
  cloneFragment: cloneFragment,
  findDOMNode: findDOMNode,
  findDOMPoint: findDOMPoint,
  findDOMRange: findDOMRange,
  findNode: findNode,
  findPath: findPath,
  findPoint: findPoint,
  findRange: findRange,
  getEventRange: getEventRange,
  getEventTransfer: getEventTransfer,
  setEventTransfer: setEventTransfer,
  ReactPlugin: ReactPlugin
};

export default index;
export { Editor$1 as Editor, cloneFragment, findDOMNode, findDOMPoint, findDOMRange, findNode, findPath, findPoint, findRange, getEventRange, getEventTransfer, setEventTransfer, ReactPlugin };
//# sourceMappingURL=slate-react.es.js.map
