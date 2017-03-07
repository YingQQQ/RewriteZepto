var fragmentRE = /^\s*<(\w+|!)[^>]*>/,
singleTagRE = /^<(\w+)\s*\/?>(?:<\/\1>|)$/,
tagExpanderRE = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,
rootNodeRE = /^(?:body|html)$/i,
capitalRE = /([A-Z])/g;
fragmentRE.test("<p />")
class Z {
  constructor(selector) {
    for (var i = 0; i < selector.length; i++) {
      this[i] = selector[i]
    }
  }
  log(a) {
    console.log(a);
  }
}
Z.prototype = {
  constructor :Z,
  length:0,
  add:function (a) {
    console.log(a);
  }
}
var $ = function (selector) {
  return new Z(selector);
}
