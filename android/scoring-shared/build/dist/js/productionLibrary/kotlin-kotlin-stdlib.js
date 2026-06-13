//region block: polyfills
(function () {
  if (typeof globalThis === 'object')
    return;
  Object.defineProperty(Object.prototype, '__magic__', {get: function () {
    return this;
  }, configurable: true});
  __magic__.globalThis = __magic__;
  delete Object.prototype.__magic__;
}());
if (typeof Math.imul === 'undefined') {
  Math.imul = function imul(a, b) {
    return (a & 4.29490176E9) * (b & 65535) + (a & 65535) * (b | 0) | 0;
  };
}
if (typeof ArrayBuffer.isView === 'undefined') {
  ArrayBuffer.isView = function (a) {
    return a != null && a.__proto__ != null && a.__proto__.__proto__ === Int8Array.prototype.__proto__;
  };
}
if (typeof Array.prototype.fill === 'undefined') {
  // Polyfill from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/fill#Polyfill
  Object.defineProperty(Array.prototype, 'fill', {value: function (value) {
    // Steps 1-2.
    if (this == null) {
      throw new TypeError('this is null or not defined');
    }
    var O = Object(this); // Steps 3-5.
    var len = O.length >>> 0; // Steps 6-7.
    var start = arguments[1];
    var relativeStart = start >> 0; // Step 8.
    var k = relativeStart < 0 ? Math.max(len + relativeStart, 0) : Math.min(relativeStart, len); // Steps 9-10.
    var end = arguments[2];
    var relativeEnd = end === undefined ? len : end >> 0; // Step 11.
    var finalValue = relativeEnd < 0 ? Math.max(len + relativeEnd, 0) : Math.min(relativeEnd, len); // Step 12.
    while (k < finalValue) {
      O[k] = value;
      k++;
    }
    ; // Step 13.
    return O;
  }});
}
[Int8Array, Int16Array, Uint16Array, Int32Array, Float32Array, Float64Array].forEach(function (TypedArray) {
  if (typeof TypedArray.prototype.fill === 'undefined') {
    Object.defineProperty(TypedArray.prototype, 'fill', {value: Array.prototype.fill});
  }
});
if (typeof Math.clz32 === 'undefined') {
  Math.clz32 = function (log, LN2) {
    return function (x) {
      var asUint = x >>> 0;
      if (asUint === 0) {
        return 32;
      }
      return 31 - (log(asUint) / LN2 | 0) | 0; // the "| 0" acts like math.floor
    };
  }(Math.log, Math.LN2);
}
//endregion
(function (factory) {
  if (typeof define === 'function' && define.amd)
    define(['exports'], factory);
  else if (typeof exports === 'object')
    factory(module.exports);
  else
    globalThis['kotlin-kotlin-stdlib'] = factory(typeof globalThis['kotlin-kotlin-stdlib'] === 'undefined' ? {} : globalThis['kotlin-kotlin-stdlib']);
}(function (_) {
  'use strict';
  //region block: imports
  var imul = Math.imul;
  var isView = ArrayBuffer.isView;
  var clz32 = Math.clz32;
  //endregion
  //region block: pre-declaration
  initMetadataForInterface(CharSequence, 'CharSequence');
  initMetadataForClass(Number_0, 'Number');
  initMetadataForClass(Char, 'Char');
  initMetadataForCompanion(Companion);
  initMetadataForInterface(Collection, 'Collection');
  function asJsReadonlyArrayView() {
    return createJsReadonlyArrayViewFrom(this);
  }
  initMetadataForInterface(KtList, 'List', VOID, VOID, [Collection]);
  initMetadataForInterface(Entry, 'Entry');
  initMetadataForCompanion(Companion_0);
  function asJsReadonlyMapView() {
    return createJsReadonlyMapViewFrom(this);
  }
  initMetadataForInterface(KtMap, 'Map');
  initMetadataForCompanion(Companion_1);
  function asJsReadonlySetView() {
    return createJsReadonlySetViewFrom(this);
  }
  initMetadataForInterface(KtSet, 'Set', VOID, VOID, [Collection]);
  initMetadataForCompanion(Companion_2);
  initMetadataForClass(Enum, 'Enum');
  initMetadataForCompanion(Companion_3);
  initMetadataForClass(Long, 'Long', VOID, Number_0);
  initMetadataForClass(JsArrayView, 'JsArrayView', JsArrayView, Array);
  initMetadataForClass(JsMapView, 'JsMapView', JsMapView, Map);
  initMetadataForClass(JsSetView, 'JsSetView', JsSetView, Set);
  initMetadataForObject(Unit, 'Unit');
  initMetadataForClass(AbstractCollection, 'AbstractCollection', VOID, VOID, [Collection]);
  initMetadataForClass(AbstractMutableCollection, 'AbstractMutableCollection', VOID, AbstractCollection, [AbstractCollection, Collection]);
  initMetadataForClass(IteratorImpl, 'IteratorImpl');
  initMetadataForClass(ListIteratorImpl, 'ListIteratorImpl', VOID, IteratorImpl);
  initMetadataForClass(AbstractMutableList, 'AbstractMutableList', VOID, AbstractMutableCollection, [AbstractMutableCollection, KtList, Collection]);
  initMetadataForClass(SubList, 'SubList', VOID, AbstractMutableList);
  initMetadataForClass(AbstractMap, 'AbstractMap', VOID, VOID, [KtMap]);
  initMetadataForClass(AbstractMutableMap, 'AbstractMutableMap', VOID, AbstractMap, [AbstractMap, KtMap]);
  initMetadataForClass(AbstractMutableSet, 'AbstractMutableSet', VOID, AbstractMutableCollection, [AbstractMutableCollection, KtSet, Collection]);
  initMetadataForCompanion(Companion_4);
  initMetadataForClass(ArrayList, 'ArrayList', ArrayList_init_$Create$, AbstractMutableList, [AbstractMutableList, KtList, Collection]);
  initMetadataForClass(HashMap, 'HashMap', HashMap_init_$Create$, AbstractMutableMap, [AbstractMutableMap, KtMap]);
  initMetadataForClass(HashMapKeys, 'HashMapKeys', VOID, AbstractMutableSet, [KtSet, Collection, AbstractMutableSet]);
  initMetadataForClass(HashMapValues, 'HashMapValues', VOID, AbstractMutableCollection, [Collection, AbstractMutableCollection]);
  initMetadataForClass(HashMapEntrySetBase, 'HashMapEntrySetBase', VOID, AbstractMutableSet, [KtSet, Collection, AbstractMutableSet]);
  initMetadataForClass(HashMapEntrySet, 'HashMapEntrySet', VOID, HashMapEntrySetBase);
  initMetadataForClass(HashMapKeysDefault$iterator$1);
  initMetadataForClass(HashMapKeysDefault, 'HashMapKeysDefault', VOID, AbstractMutableSet);
  initMetadataForClass(HashMapValuesDefault$iterator$1);
  initMetadataForClass(HashMapValuesDefault, 'HashMapValuesDefault', VOID, AbstractMutableCollection);
  initMetadataForClass(HashSet, 'HashSet', HashSet_init_$Create$, AbstractMutableSet, [AbstractMutableSet, KtSet, Collection]);
  initMetadataForCompanion(Companion_5);
  initMetadataForClass(Itr, 'Itr');
  initMetadataForClass(KeysItr, 'KeysItr', VOID, Itr);
  initMetadataForClass(ValuesItr, 'ValuesItr', VOID, Itr);
  initMetadataForClass(EntriesItr, 'EntriesItr', VOID, Itr);
  initMetadataForClass(EntryRef, 'EntryRef', VOID, VOID, [Entry]);
  function containsAllEntries(m) {
    var tmp$ret$0;
    $l$block_0: {
      // Inline function 'kotlin.collections.all' call
      var tmp;
      if (isInterface(m, Collection)) {
        tmp = m.e();
      } else {
        tmp = false;
      }
      if (tmp) {
        tmp$ret$0 = true;
        break $l$block_0;
      }
      var _iterator__ex2g4s = m.b();
      while (_iterator__ex2g4s.c()) {
        var element = _iterator__ex2g4s.d();
        // Inline function 'kotlin.js.unsafeCast' call
        // Inline function 'kotlin.js.asDynamic' call
        var entry = element;
        var tmp_0;
        if (!(entry == null) ? isInterface(entry, Entry) : false) {
          tmp_0 = this.c6(entry);
        } else {
          tmp_0 = false;
        }
        if (!tmp_0) {
          tmp$ret$0 = false;
          break $l$block_0;
        }
      }
      tmp$ret$0 = true;
    }
    return tmp$ret$0;
  }
  initMetadataForInterface(InternalMap, 'InternalMap');
  initMetadataForClass(InternalHashMap, 'InternalHashMap', InternalHashMap_init_$Create$, VOID, [InternalMap]);
  initMetadataForObject(EmptyHolder, 'EmptyHolder');
  initMetadataForClass(LinkedHashMap, 'LinkedHashMap', LinkedHashMap_init_$Create$, HashMap, [HashMap, KtMap]);
  initMetadataForObject(EmptyHolder_0, 'EmptyHolder');
  initMetadataForClass(LinkedHashSet, 'LinkedHashSet', LinkedHashSet_init_$Create$, HashSet, [HashSet, KtSet, Collection]);
  initMetadataForClass(Exception, 'Exception', Exception_init_$Create$, Error);
  initMetadataForClass(RuntimeException, 'RuntimeException', RuntimeException_init_$Create$, Exception);
  initMetadataForClass(IllegalArgumentException, 'IllegalArgumentException', IllegalArgumentException_init_$Create$, RuntimeException);
  initMetadataForClass(IllegalStateException, 'IllegalStateException', IllegalStateException_init_$Create$, RuntimeException);
  initMetadataForClass(UnsupportedOperationException, 'UnsupportedOperationException', UnsupportedOperationException_init_$Create$, RuntimeException);
  initMetadataForClass(NoSuchElementException, 'NoSuchElementException', NoSuchElementException_init_$Create$, RuntimeException);
  initMetadataForClass(IndexOutOfBoundsException, 'IndexOutOfBoundsException', IndexOutOfBoundsException_init_$Create$, RuntimeException);
  initMetadataForClass(ConcurrentModificationException, 'ConcurrentModificationException', ConcurrentModificationException_init_$Create$, RuntimeException);
  initMetadataForClass(NullPointerException, 'NullPointerException', NullPointerException_init_$Create$, RuntimeException);
  initMetadataForClass(ClassCastException, 'ClassCastException', ClassCastException_init_$Create$, RuntimeException);
  initMetadataForClass(StringBuilder, 'StringBuilder', StringBuilder_init_$Create$_0, VOID, [CharSequence]);
  initMetadataForClass(AbstractList, 'AbstractList', VOID, AbstractCollection, [AbstractCollection, KtList]);
  initMetadataForClass(SubList_0, 'SubList', VOID, AbstractList);
  initMetadataForClass(IteratorImpl_0, 'IteratorImpl');
  initMetadataForClass(ListIteratorImpl_0, 'ListIteratorImpl', VOID, IteratorImpl_0);
  initMetadataForCompanion(Companion_6);
  initMetadataForClass(AbstractMap$keys$1$iterator$1);
  initMetadataForClass(AbstractMap$values$1$iterator$1);
  initMetadataForCompanion(Companion_7);
  initMetadataForClass(AbstractSet, 'AbstractSet', VOID, AbstractCollection, [AbstractCollection, KtSet]);
  initMetadataForClass(AbstractMap$keys$1, VOID, VOID, AbstractSet);
  initMetadataForClass(AbstractMap$values$1, VOID, VOID, AbstractCollection);
  initMetadataForCompanion(Companion_8);
  initMetadataForObject(EmptyList, 'EmptyList', VOID, VOID, [KtList]);
  initMetadataForObject(EmptyIterator, 'EmptyIterator');
  initMetadataForObject(EmptyMap, 'EmptyMap', VOID, VOID, [KtMap]);
  initMetadataForObject(EmptySet, 'EmptySet', VOID, VOID, [KtSet]);
  initMetadataForClass(EnumEntriesList, 'EnumEntriesList', VOID, AbstractList, [KtList, AbstractList]);
  initMetadataForClass(Pair, 'Pair');
  //endregion
  function CharSequence() {
  }
  function Number_0() {
  }
  function indexOf(_this__u8e3s4, element) {
    if (element == null) {
      var inductionVariable = 0;
      var last = _this__u8e3s4.length - 1 | 0;
      if (inductionVariable <= last)
        do {
          var index = inductionVariable;
          inductionVariable = inductionVariable + 1 | 0;
          if (_this__u8e3s4[index] == null) {
            return index;
          }
        }
         while (inductionVariable <= last);
    } else {
      var inductionVariable_0 = 0;
      var last_0 = _this__u8e3s4.length - 1 | 0;
      if (inductionVariable_0 <= last_0)
        do {
          var index_0 = inductionVariable_0;
          inductionVariable_0 = inductionVariable_0 + 1 | 0;
          if (equals(element, _this__u8e3s4[index_0])) {
            return index_0;
          }
        }
         while (inductionVariable_0 <= last_0);
    }
    return -1;
  }
  function lastIndexOf(_this__u8e3s4, element) {
    if (element == null) {
      var inductionVariable = _this__u8e3s4.length - 1 | 0;
      if (0 <= inductionVariable)
        do {
          var index = inductionVariable;
          inductionVariable = inductionVariable + -1 | 0;
          if (_this__u8e3s4[index] == null) {
            return index;
          }
        }
         while (0 <= inductionVariable);
    } else {
      var inductionVariable_0 = _this__u8e3s4.length - 1 | 0;
      if (0 <= inductionVariable_0)
        do {
          var index_0 = inductionVariable_0;
          inductionVariable_0 = inductionVariable_0 + -1 | 0;
          if (equals(element, _this__u8e3s4[index_0])) {
            return index_0;
          }
        }
         while (0 <= inductionVariable_0);
    }
    return -1;
  }
  function joinToString(_this__u8e3s4, separator, prefix, postfix, limit, truncated, transform) {
    separator = separator === VOID ? ', ' : separator;
    prefix = prefix === VOID ? '' : prefix;
    postfix = postfix === VOID ? '' : postfix;
    limit = limit === VOID ? -1 : limit;
    truncated = truncated === VOID ? '...' : truncated;
    transform = transform === VOID ? null : transform;
    return joinTo(_this__u8e3s4, StringBuilder_init_$Create$_0(), separator, prefix, postfix, limit, truncated, transform).toString();
  }
  function joinTo(_this__u8e3s4, buffer, separator, prefix, postfix, limit, truncated, transform) {
    separator = separator === VOID ? ', ' : separator;
    prefix = prefix === VOID ? '' : prefix;
    postfix = postfix === VOID ? '' : postfix;
    limit = limit === VOID ? -1 : limit;
    truncated = truncated === VOID ? '...' : truncated;
    transform = transform === VOID ? null : transform;
    buffer.a(prefix);
    var count = 0;
    var inductionVariable = 0;
    var last = _this__u8e3s4.length;
    $l$loop: while (inductionVariable < last) {
      var element = _this__u8e3s4[inductionVariable];
      inductionVariable = inductionVariable + 1 | 0;
      count = count + 1 | 0;
      if (count > 1) {
        buffer.a(separator);
      }
      if (limit < 0 || count <= limit) {
        appendElement(buffer, element, transform);
      } else
        break $l$loop;
    }
    if (limit >= 0 && count > limit) {
      buffer.a(truncated);
    }
    buffer.a(postfix);
    return buffer;
  }
  function getOrNull(_this__u8e3s4, index) {
    return (0 <= index ? index <= (_this__u8e3s4.length - 1 | 0) : false) ? _this__u8e3s4[index] : null;
  }
  function joinToString_0(_this__u8e3s4, separator, prefix, postfix, limit, truncated, transform) {
    separator = separator === VOID ? ', ' : separator;
    prefix = prefix === VOID ? '' : prefix;
    postfix = postfix === VOID ? '' : postfix;
    limit = limit === VOID ? -1 : limit;
    truncated = truncated === VOID ? '...' : truncated;
    transform = transform === VOID ? null : transform;
    return joinTo_0(_this__u8e3s4, StringBuilder_init_$Create$_0(), separator, prefix, postfix, limit, truncated, transform).toString();
  }
  function joinTo_0(_this__u8e3s4, buffer, separator, prefix, postfix, limit, truncated, transform) {
    separator = separator === VOID ? ', ' : separator;
    prefix = prefix === VOID ? '' : prefix;
    postfix = postfix === VOID ? '' : postfix;
    limit = limit === VOID ? -1 : limit;
    truncated = truncated === VOID ? '...' : truncated;
    transform = transform === VOID ? null : transform;
    buffer.a(prefix);
    var count = 0;
    var _iterator__ex2g4s = _this__u8e3s4.b();
    $l$loop: while (_iterator__ex2g4s.c()) {
      var element = _iterator__ex2g4s.d();
      count = count + 1 | 0;
      if (count > 1) {
        buffer.a(separator);
      }
      if (limit < 0 || count <= limit) {
        appendElement(buffer, element, transform);
      } else
        break $l$loop;
    }
    if (limit >= 0 && count > limit) {
      buffer.a(truncated);
    }
    buffer.a(postfix);
    return buffer;
  }
  function last(_this__u8e3s4) {
    if (_this__u8e3s4.e())
      throw NoSuchElementException_init_$Create$_0('List is empty.');
    return _this__u8e3s4.f(get_lastIndex(_this__u8e3s4));
  }
  function coerceAtLeast(_this__u8e3s4, minimumValue) {
    return _this__u8e3s4 < minimumValue ? minimumValue : _this__u8e3s4;
  }
  function coerceIn(_this__u8e3s4, minimumValue, maximumValue) {
    if (minimumValue > maximumValue)
      throw IllegalArgumentException_init_$Create$_0('Cannot coerce value to an empty range: maximum ' + maximumValue + ' is less than minimum ' + minimumValue + '.');
    if (_this__u8e3s4 < minimumValue)
      return minimumValue;
    if (_this__u8e3s4 > maximumValue)
      return maximumValue;
    return _this__u8e3s4;
  }
  function coerceAtLeast_0(_this__u8e3s4, minimumValue) {
    return _this__u8e3s4 < minimumValue ? minimumValue : _this__u8e3s4;
  }
  function coerceIn_0(_this__u8e3s4, minimumValue, maximumValue) {
    if (minimumValue > maximumValue)
      throw IllegalArgumentException_init_$Create$_0('Cannot coerce value to an empty range: maximum ' + maximumValue + ' is less than minimum ' + minimumValue + '.');
    if (_this__u8e3s4 < minimumValue)
      return minimumValue;
    if (_this__u8e3s4 > maximumValue)
      return maximumValue;
    return _this__u8e3s4;
  }
  function coerceAtMost(_this__u8e3s4, maximumValue) {
    return _this__u8e3s4 > maximumValue ? maximumValue : _this__u8e3s4;
  }
  function _Char___init__impl__6a9atx(value) {
    return value;
  }
  function _get_value__a43j40($this) {
    return $this;
  }
  function toString($this) {
    // Inline function 'kotlin.js.unsafeCast' call
    return String.fromCharCode(_get_value__a43j40($this));
  }
  function Char() {
  }
  protoOf(Companion).fromJsArray = function (array) {
    return createListFrom(array);
  };
  function Companion() {
  }
  var Companion_instance;
  function Companion_getInstance() {
    return Companion_instance;
  }
  function KtList() {
  }
  function Collection() {
  }
  function Entry() {
  }
  protoOf(Companion_0).fromJsMap = function (map) {
    return createMapFrom(map);
  };
  function Companion_0() {
  }
  var Companion_instance_0;
  function Companion_getInstance_0() {
    return Companion_instance_0;
  }
  function KtMap() {
  }
  protoOf(Companion_1).fromJsSet = function (set) {
    return createSetFrom(set);
  };
  function Companion_1() {
  }
  var Companion_instance_1;
  function Companion_getInstance_1() {
    return Companion_instance_1;
  }
  function KtSet() {
  }
  function Companion_2() {
  }
  var Companion_instance_2;
  function Companion_getInstance_2() {
    return Companion_instance_2;
  }
  function Enum(name, ordinal) {
    this.w_1 = name;
    this.x_1 = ordinal;
  }
  protoOf(Enum).y = function () {
    return this.w_1;
  };
  protoOf(Enum).z = function () {
    return this.x_1;
  };
  protoOf(Enum).a1 = function (other) {
    return compareTo(this.x_1, other.x_1);
  };
  protoOf(Enum).b1 = function (other) {
    return this.a1(other instanceof Enum ? other : THROW_CCE());
  };
  protoOf(Enum).equals = function (other) {
    return this === other;
  };
  protoOf(Enum).hashCode = function () {
    return identityHashCode(this);
  };
  protoOf(Enum).toString = function () {
    return this.w_1;
  };
  function toString_0(_this__u8e3s4) {
    var tmp1_elvis_lhs = _this__u8e3s4 == null ? null : toString_1(_this__u8e3s4);
    return tmp1_elvis_lhs == null ? 'null' : tmp1_elvis_lhs;
  }
  function Companion_3() {
    Companion_instance_3 = this;
    this.c1_1 = new Long(0, -2147483648);
    this.d1_1 = new Long(-1, 2147483647);
    this.e1_1 = 8;
    this.f1_1 = 64;
  }
  var Companion_instance_3;
  function Companion_getInstance_3() {
    if (Companion_instance_3 == null)
      new Companion_3();
    return Companion_instance_3;
  }
  function Long(low, high) {
    Companion_getInstance_3();
    Number_0.call(this);
    this.g1_1 = low;
    this.h1_1 = high;
  }
  protoOf(Long).i1 = function (other) {
    return compare(this, other);
  };
  protoOf(Long).b1 = function (other) {
    return this.i1(other instanceof Long ? other : THROW_CCE());
  };
  protoOf(Long).j1 = function (other) {
    return add(this, other);
  };
  protoOf(Long).k1 = function (other) {
    return divide(this, other);
  };
  protoOf(Long).l1 = function () {
    return this.m1().j1(new Long(1, 0));
  };
  protoOf(Long).m1 = function () {
    return new Long(~this.g1_1, ~this.h1_1);
  };
  protoOf(Long).n1 = function () {
    return this.g1_1;
  };
  protoOf(Long).o1 = function () {
    return toNumber(this);
  };
  protoOf(Long).toString = function () {
    return toStringImpl(this, 10);
  };
  protoOf(Long).equals = function (other) {
    var tmp;
    if (other instanceof Long) {
      tmp = equalsLong(this, other);
    } else {
      tmp = false;
    }
    return tmp;
  };
  protoOf(Long).hashCode = function () {
    return hashCode_0(this);
  };
  protoOf(Long).valueOf = function () {
    return this.o1();
  };
  function implement(interfaces) {
    var maxSize = 1;
    var masks = [];
    var inductionVariable = 0;
    var last = interfaces.length;
    while (inductionVariable < last) {
      var i = interfaces[inductionVariable];
      inductionVariable = inductionVariable + 1 | 0;
      var currentSize = maxSize;
      var tmp0_elvis_lhs = i.prototype.$imask$;
      var imask = tmp0_elvis_lhs == null ? i.$imask$ : tmp0_elvis_lhs;
      if (!(imask == null)) {
        masks.push(imask);
        currentSize = imask.length;
      }
      var iid = i.$metadata$.iid;
      var tmp;
      if (iid == null) {
        tmp = null;
      } else {
        // Inline function 'kotlin.let' call
        tmp = bitMaskWith(iid);
      }
      var iidImask = tmp;
      if (!(iidImask == null)) {
        masks.push(iidImask);
        currentSize = Math.max(currentSize, iidImask.length);
      }
      if (currentSize > maxSize) {
        maxSize = currentSize;
      }
    }
    return compositeBitMask(maxSize, masks);
  }
  function bitMaskWith(activeBit) {
    var numberIndex = activeBit >> 5;
    var intArray = new Int32Array(numberIndex + 1 | 0);
    var positionInNumber = activeBit & 31;
    var numberWithSettledBit = 1 << positionInNumber;
    intArray[numberIndex] = intArray[numberIndex] | numberWithSettledBit;
    return intArray;
  }
  function compositeBitMask(capacity, masks) {
    var tmp = 0;
    var tmp_0 = new Int32Array(capacity);
    while (tmp < capacity) {
      var tmp_1 = tmp;
      var result = 0;
      var inductionVariable = 0;
      var last = masks.length;
      while (inductionVariable < last) {
        var mask = masks[inductionVariable];
        inductionVariable = inductionVariable + 1 | 0;
        if (tmp_1 < mask.length) {
          result = result | mask[tmp_1];
        }
      }
      tmp_0[tmp_1] = result;
      tmp = tmp + 1 | 0;
    }
    return tmp_0;
  }
  function isBitSet(_this__u8e3s4, possibleActiveBit) {
    var numberIndex = possibleActiveBit >> 5;
    if (numberIndex > _this__u8e3s4.length)
      return false;
    var positionInNumber = possibleActiveBit & 31;
    var numberWithSettledBit = 1 << positionInNumber;
    return !((_this__u8e3s4[numberIndex] & numberWithSettledBit) === 0);
  }
  function get_buf() {
    _init_properties_bitUtils_kt__nfcg4k();
    return buf;
  }
  var buf;
  function get_bufFloat64() {
    _init_properties_bitUtils_kt__nfcg4k();
    return bufFloat64;
  }
  var bufFloat64;
  var bufFloat32;
  function get_bufInt32() {
    _init_properties_bitUtils_kt__nfcg4k();
    return bufInt32;
  }
  var bufInt32;
  function get_lowIndex() {
    _init_properties_bitUtils_kt__nfcg4k();
    return lowIndex;
  }
  var lowIndex;
  function get_highIndex() {
    _init_properties_bitUtils_kt__nfcg4k();
    return highIndex;
  }
  var highIndex;
  function getNumberHashCode(obj) {
    _init_properties_bitUtils_kt__nfcg4k();
    // Inline function 'kotlin.js.jsBitwiseOr' call
    // Inline function 'kotlin.js.unsafeCast' call
    // Inline function 'kotlin.js.asDynamic' call
    if ((obj | 0) === obj) {
      return numberToInt(obj);
    }
    get_bufFloat64()[0] = obj;
    return imul(get_bufInt32()[get_highIndex()], 31) + get_bufInt32()[get_lowIndex()] | 0;
  }
  var properties_initialized_bitUtils_kt_i2bo3e;
  function _init_properties_bitUtils_kt__nfcg4k() {
    if (!properties_initialized_bitUtils_kt_i2bo3e) {
      properties_initialized_bitUtils_kt_i2bo3e = true;
      buf = new ArrayBuffer(8);
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      bufFloat64 = new Float64Array(get_buf());
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      bufFloat32 = new Float32Array(get_buf());
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      bufInt32 = new Int32Array(get_buf());
      // Inline function 'kotlin.run' call
      get_bufFloat64()[0] = -1.0;
      lowIndex = !(get_bufInt32()[0] === 0) ? 1 : 0;
      highIndex = 1 - get_lowIndex() | 0;
    }
  }
  function arrayToString(array) {
    return joinToString(array, ', ', '[', ']', VOID, VOID, arrayToString$lambda);
  }
  function arrayToString$lambda(it) {
    return toString_1(it);
  }
  function createJsReadonlyArrayViewFrom(list) {
    var tmp = createJsReadonlyArrayViewFrom$lambda(list);
    var tmp_0 = createJsReadonlyArrayViewFrom$lambda_0(list);
    // Inline function 'kotlin.js.asDynamic' call
    var tmp_1 = UNSUPPORTED_OPERATION$ref();
    // Inline function 'kotlin.js.asDynamic' call
    var tmp_2 = UNSUPPORTED_OPERATION$ref_0();
    // Inline function 'kotlin.js.asDynamic' call
    var tmp$ret$2 = UNSUPPORTED_OPERATION$ref_1();
    return createJsArrayViewWith(tmp, tmp_0, tmp_1, tmp_2, tmp$ret$2);
  }
  function createJsArrayViewWith(listSize, listGet, listSet, listDecreaseSize, listIncreaseSize) {
    var arrayView = new Array();
    var tmp = Object;
    // Inline function 'kotlin.js.asDynamic' call
    var tmp$ret$0 = JsArrayView;
    tmp.setPrototypeOf(arrayView, tmp$ret$0.prototype);
    return new Proxy(arrayView, {get: function (target, prop, receiver) {
      if (prop === 'length')
        return listSize();
      var type = typeof prop;
      var index = type === 'string' || type === 'number' ? +prop : undefined;
      if (!isNaN(index))
        return listGet(index);
      return target[prop];
    }, has: function (target, key) {
      return !isNaN(key) && key < listSize();
    }, set: function (obj, prop, value) {
      if (prop === 'length') {
        var size = listSize();
        var newSize = type === 'string' || type === 'number' ? +prop : undefined;
        if (isNaN(newSize))
          throw new RangeError('invalid array length');
        if (newSize < size)
          listDecreaseSize(size - newSize);
        else
          listIncreaseSize(newSize - size);
        return true;
      }
      var type = typeof prop;
      var index = type === 'string' || type === 'number' ? +prop : undefined;
      if (isNaN(index))
        return false;
      listSet(index, value);
      return true;
    }});
  }
  function UNSUPPORTED_OPERATION() {
    throw UnsupportedOperationException_init_$Create$();
  }
  function JsArrayView() {
    Array.call(this);
  }
  function createJsReadonlyMapViewFrom(map) {
    var tmp = createJsReadonlyMapViewFrom$lambda(map);
    var tmp_0 = createJsReadonlyMapViewFrom$lambda_0(map);
    var tmp_1 = createJsReadonlyMapViewFrom$lambda_1(map);
    // Inline function 'kotlin.js.asDynamic' call
    var tmp_2 = UNSUPPORTED_OPERATION$ref_2();
    // Inline function 'kotlin.js.asDynamic' call
    var tmp_3 = UNSUPPORTED_OPERATION$ref_3();
    // Inline function 'kotlin.js.asDynamic' call
    var tmp_4 = UNSUPPORTED_OPERATION$ref_4();
    var tmp_5 = createJsReadonlyMapViewFrom$lambda_2(map);
    var tmp_6 = createJsReadonlyMapViewFrom$lambda_3(map);
    var tmp_7 = createJsReadonlyMapViewFrom$lambda_4(map);
    return createJsMapViewWith(tmp, tmp_0, tmp_1, tmp_2, tmp_3, tmp_4, tmp_5, tmp_6, tmp_7, createJsReadonlyMapViewFrom$lambda_5);
  }
  function createJsReadonlySetViewFrom(set) {
    var tmp = createJsReadonlySetViewFrom$lambda(set);
    // Inline function 'kotlin.js.asDynamic' call
    var tmp_0 = UNSUPPORTED_OPERATION$ref_5();
    // Inline function 'kotlin.js.asDynamic' call
    var tmp_1 = UNSUPPORTED_OPERATION$ref_6();
    // Inline function 'kotlin.js.asDynamic' call
    var tmp_2 = UNSUPPORTED_OPERATION$ref_7();
    var tmp_3 = createJsReadonlySetViewFrom$lambda_0(set);
    var tmp_4 = createJsReadonlySetViewFrom$lambda_1(set);
    var tmp_5 = createJsReadonlySetViewFrom$lambda_2(set);
    return createJsSetViewWith(tmp, tmp_0, tmp_1, tmp_2, tmp_3, tmp_4, tmp_5, createJsReadonlySetViewFrom$lambda_3);
  }
  function createJsMapViewWith(mapSize, mapGet, mapContains, mapPut, mapRemove, mapClear, keysIterator, valuesIterator, entriesIterator, forEach) {
    // Inline function 'kotlin.also' call
    var this_0 = objectCreate(protoOf(JsMapView));
    this_0[Symbol.iterator] = entriesIterator;
    defineProp(this_0, 'size', mapSize, VOID);
    var mapView = this_0;
    return Object.assign(mapView, {get: mapGet, set: function (key, value) {
      mapPut(key, value);
      return this;
    }, 'delete': mapRemove, clear: mapClear, has: mapContains, keys: keysIterator, values: valuesIterator, entries: entriesIterator, forEach: function (cb, thisArg) {
      forEach(cb, mapView, thisArg);
    }});
  }
  function createJsIteratorFrom(iterator, transform) {
    var tmp;
    if (transform === VOID) {
      tmp = createJsIteratorFrom$lambda;
    } else {
      tmp = transform;
    }
    transform = tmp;
    var iteratorNext = createJsIteratorFrom$lambda_0(iterator);
    var iteratorHasNext = createJsIteratorFrom$lambda_1(iterator);
    var jsIterator = {next: function () {
      var result = {done: !iteratorHasNext()};
      if (!result.done)
        result.value = transform(iteratorNext());
      return result;
    }};
    jsIterator[Symbol.iterator] = function () {
      return this;
    };
    return jsIterator;
  }
  function forEach(cb, collection, thisArg) {
    thisArg = thisArg === VOID ? undefined : thisArg;
    var iterator = collection.entries();
    var result = iterator.next();
    while (!result.done) {
      var value = result.value;
      // Inline function 'kotlin.js.asDynamic' call
      cb.call(thisArg, value[1], value[0], collection);
      result = iterator.next();
    }
  }
  function createJsSetViewWith(setSize, setAdd, setRemove, setClear, setContains, valuesIterator, entriesIterator, forEach) {
    // Inline function 'kotlin.also' call
    var this_0 = objectCreate(protoOf(JsSetView));
    this_0[Symbol.iterator] = valuesIterator;
    defineProp(this_0, 'size', setSize, VOID);
    var setView = this_0;
    return Object.assign(setView, {add: function (value) {
      setAdd(value);
      return this;
    }, 'delete': setRemove, clear: setClear, has: setContains, keys: valuesIterator, values: valuesIterator, entries: entriesIterator, forEach: function (cb, thisArg) {
      forEach(cb, setView, thisArg);
    }});
  }
  function JsMapView() {
    Map.call(this);
  }
  function JsSetView() {
    Set.call(this);
  }
  function createListFrom(array) {
    // Inline function 'kotlin.js.asDynamic' call
    // Inline function 'kotlin.js.unsafeCast' call
    var tmp$ret$1 = array.slice();
    return (new ArrayList(tmp$ret$1)).s1();
  }
  function createSetFrom(set) {
    // Inline function 'kotlin.collections.buildSetInternal' call
    // Inline function 'kotlin.apply' call
    var this_0 = LinkedHashSet_init_$Create$();
    forEach(createSetFrom$lambda(this_0), set);
    return this_0.s1();
  }
  function createMapFrom(map) {
    // Inline function 'kotlin.collections.buildMapInternal' call
    // Inline function 'kotlin.apply' call
    var this_0 = LinkedHashMap_init_$Create$();
    forEach(createMapFrom$lambda(this_0), map);
    return this_0.s1();
  }
  function createJsReadonlyArrayViewFrom$lambda($list) {
    return function () {
      return $list.g();
    };
  }
  function createJsReadonlyArrayViewFrom$lambda_0($list) {
    return function (i) {
      return $list.f(i);
    };
  }
  function UNSUPPORTED_OPERATION$ref() {
    var l = function () {
      UNSUPPORTED_OPERATION();
      return Unit_instance;
    };
    l.callableName = 'UNSUPPORTED_OPERATION';
    return l;
  }
  function UNSUPPORTED_OPERATION$ref_0() {
    var l = function () {
      UNSUPPORTED_OPERATION();
      return Unit_instance;
    };
    l.callableName = 'UNSUPPORTED_OPERATION';
    return l;
  }
  function UNSUPPORTED_OPERATION$ref_1() {
    var l = function () {
      UNSUPPORTED_OPERATION();
      return Unit_instance;
    };
    l.callableName = 'UNSUPPORTED_OPERATION';
    return l;
  }
  function createJsReadonlyMapViewFrom$lambda($map) {
    return function () {
      return $map.g();
    };
  }
  function createJsReadonlyMapViewFrom$lambda_0($map) {
    return function (k) {
      return $map.s(k);
    };
  }
  function createJsReadonlyMapViewFrom$lambda_1($map) {
    return function (k) {
      return $map.q(k);
    };
  }
  function UNSUPPORTED_OPERATION$ref_2() {
    var l = function () {
      UNSUPPORTED_OPERATION();
      return Unit_instance;
    };
    l.callableName = 'UNSUPPORTED_OPERATION';
    return l;
  }
  function UNSUPPORTED_OPERATION$ref_3() {
    var l = function () {
      UNSUPPORTED_OPERATION();
      return Unit_instance;
    };
    l.callableName = 'UNSUPPORTED_OPERATION';
    return l;
  }
  function UNSUPPORTED_OPERATION$ref_4() {
    var l = function () {
      UNSUPPORTED_OPERATION();
      return Unit_instance;
    };
    l.callableName = 'UNSUPPORTED_OPERATION';
    return l;
  }
  function createJsReadonlyMapViewFrom$lambda_2($map) {
    return function () {
      return createJsIteratorFrom($map.t().b());
    };
  }
  function createJsReadonlyMapViewFrom$lambda_3($map) {
    return function () {
      return createJsIteratorFrom($map.u().b());
    };
  }
  function createJsReadonlyMapViewFrom$lambda$lambda(it) {
    // Inline function 'kotlin.arrayOf' call
    // Inline function 'kotlin.js.unsafeCast' call
    // Inline function 'kotlin.js.asDynamic' call
    return [it.o(), it.p()];
  }
  function createJsReadonlyMapViewFrom$lambda_4($map) {
    return function () {
      var tmp = $map.v().b();
      return createJsIteratorFrom(tmp, createJsReadonlyMapViewFrom$lambda$lambda);
    };
  }
  function createJsReadonlyMapViewFrom$lambda_5(callback, map, thisArg) {
    forEach(callback, map, thisArg);
    return Unit_instance;
  }
  function createJsReadonlySetViewFrom$lambda($set) {
    return function () {
      return $set.g();
    };
  }
  function UNSUPPORTED_OPERATION$ref_5() {
    var l = function () {
      UNSUPPORTED_OPERATION();
      return Unit_instance;
    };
    l.callableName = 'UNSUPPORTED_OPERATION';
    return l;
  }
  function UNSUPPORTED_OPERATION$ref_6() {
    var l = function () {
      UNSUPPORTED_OPERATION();
      return Unit_instance;
    };
    l.callableName = 'UNSUPPORTED_OPERATION';
    return l;
  }
  function UNSUPPORTED_OPERATION$ref_7() {
    var l = function () {
      UNSUPPORTED_OPERATION();
      return Unit_instance;
    };
    l.callableName = 'UNSUPPORTED_OPERATION';
    return l;
  }
  function createJsReadonlySetViewFrom$lambda_0($set) {
    return function (v) {
      return $set.h(v);
    };
  }
  function createJsReadonlySetViewFrom$lambda_1($set) {
    return function () {
      return createJsIteratorFrom($set.b());
    };
  }
  function createJsReadonlySetViewFrom$lambda$lambda(it) {
    // Inline function 'kotlin.arrayOf' call
    // Inline function 'kotlin.js.unsafeCast' call
    // Inline function 'kotlin.js.asDynamic' call
    return [it, it];
  }
  function createJsReadonlySetViewFrom$lambda_2($set) {
    return function () {
      var tmp = $set.b();
      return createJsIteratorFrom(tmp, createJsReadonlySetViewFrom$lambda$lambda);
    };
  }
  function createJsReadonlySetViewFrom$lambda_3(callback, set, thisArg) {
    forEach(callback, set, thisArg);
    return Unit_instance;
  }
  function createJsIteratorFrom$lambda(it) {
    return it;
  }
  function createJsIteratorFrom$lambda_0($iterator) {
    return function () {
      return $iterator.d();
    };
  }
  function createJsIteratorFrom$lambda_1($iterator) {
    return function () {
      return $iterator.c();
    };
  }
  function createSetFrom$lambda($$this$buildSetInternal) {
    return function (_unused_var__etf5q3, value, _unused_var__etf5q3_0) {
      $$this$buildSetInternal.a2(value);
      return Unit_instance;
    };
  }
  function createMapFrom$lambda($$this$buildMapInternal) {
    return function (value, key, _unused_var__etf5q3) {
      $$this$buildMapInternal.b2(key, value);
      return Unit_instance;
    };
  }
  function compareTo(a, b) {
    var tmp;
    switch (typeof a) {
      case 'number':
        var tmp_0;
        if (typeof b === 'number') {
          tmp_0 = doubleCompareTo(a, b);
        } else {
          if (b instanceof Long) {
            tmp_0 = doubleCompareTo(a, b.o1());
          } else {
            tmp_0 = primitiveCompareTo(a, b);
          }
        }

        tmp = tmp_0;
        break;
      case 'string':
      case 'boolean':
        tmp = primitiveCompareTo(a, b);
        break;
      default:
        tmp = compareToDoNotIntrinsicify(a, b);
        break;
    }
    return tmp;
  }
  function doubleCompareTo(a, b) {
    var tmp;
    if (a < b) {
      tmp = -1;
    } else if (a > b) {
      tmp = 1;
    } else if (a === b) {
      var tmp_0;
      if (a !== 0) {
        tmp_0 = 0;
      } else {
        // Inline function 'kotlin.js.asDynamic' call
        var ia = 1 / a;
        var tmp_1;
        // Inline function 'kotlin.js.asDynamic' call
        if (ia === 1 / b) {
          tmp_1 = 0;
        } else {
          if (ia < 0) {
            tmp_1 = -1;
          } else {
            tmp_1 = 1;
          }
        }
        tmp_0 = tmp_1;
      }
      tmp = tmp_0;
    } else if (a !== a) {
      tmp = b !== b ? 0 : 1;
    } else {
      tmp = -1;
    }
    return tmp;
  }
  function primitiveCompareTo(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  }
  function compareToDoNotIntrinsicify(a, b) {
    return a.b1(b);
  }
  function identityHashCode(obj) {
    return getObjectHashCode(obj);
  }
  function getObjectHashCode(obj) {
    // Inline function 'kotlin.js.jsIn' call
    if (!('kotlinHashCodeValue$' in obj)) {
      var hash = calculateRandomHash();
      var descriptor = new Object();
      descriptor.value = hash;
      descriptor.enumerable = false;
      Object.defineProperty(obj, 'kotlinHashCodeValue$', descriptor);
    }
    // Inline function 'kotlin.js.unsafeCast' call
    return obj['kotlinHashCodeValue$'];
  }
  function calculateRandomHash() {
    // Inline function 'kotlin.js.jsBitwiseOr' call
    return Math.random() * 4.294967296E9 | 0;
  }
  function objectCreate(proto) {
    proto = proto === VOID ? null : proto;
    return Object.create(proto);
  }
  function defineProp(obj, name, getter, setter) {
    return Object.defineProperty(obj, name, {configurable: true, get: getter, set: setter});
  }
  function toString_1(o) {
    var tmp;
    if (o == null) {
      tmp = 'null';
    } else if (isArrayish(o)) {
      tmp = '[...]';
    } else if (!(typeof o.toString === 'function')) {
      tmp = anyToString(o);
    } else {
      // Inline function 'kotlin.js.unsafeCast' call
      tmp = o.toString();
    }
    return tmp;
  }
  function anyToString(o) {
    return Object.prototype.toString.call(o);
  }
  function hashCode(obj) {
    if (obj == null)
      return 0;
    var typeOf = typeof obj;
    var tmp;
    switch (typeOf) {
      case 'object':
        tmp = 'function' === typeof obj.hashCode ? obj.hashCode() : getObjectHashCode(obj);
        break;
      case 'function':
        tmp = getObjectHashCode(obj);
        break;
      case 'number':
        tmp = getNumberHashCode(obj);
        break;
      case 'boolean':
        // Inline function 'kotlin.js.unsafeCast' call

        tmp = getBooleanHashCode(obj);
        break;
      case 'string':
        tmp = getStringHashCode(String(obj));
        break;
      case 'bigint':
        tmp = getBigIntHashCode(obj);
        break;
      case 'symbol':
        tmp = getSymbolHashCode(obj);
        break;
      default:
        tmp = function () {
          throw new Error('Unexpected typeof `' + typeOf + '`');
        }();
        break;
    }
    return tmp;
  }
  function getBooleanHashCode(value) {
    return value ? 1231 : 1237;
  }
  function getStringHashCode(str) {
    var hash = 0;
    var length = str.length;
    var inductionVariable = 0;
    var last = length - 1 | 0;
    if (inductionVariable <= last)
      do {
        var i = inductionVariable;
        inductionVariable = inductionVariable + 1 | 0;
        // Inline function 'kotlin.js.asDynamic' call
        var code = str.charCodeAt(i);
        hash = imul(hash, 31) + code | 0;
      }
       while (!(i === last));
    return hash;
  }
  function getBigIntHashCode(value) {
    var shiftNumber = BigInt(32);
    var MASK = BigInt(4.294967295E9);
    var bigNumber = value < 0 ? -value : value;
    var hashCode = 0;
    var signum = value < 0 ? -1 : 1;
    while (bigNumber != 0) {
      // Inline function 'kotlin.js.unsafeCast' call
      var chunk = Number(bigNumber & MASK);
      hashCode = imul(31, hashCode) + chunk | 0;
      bigNumber = bigNumber >> shiftNumber;
    }
    return imul(hashCode, signum);
  }
  function getSymbolHashCode(value) {
    var hashCodeMap = symbolIsSharable(value) ? getSymbolMap() : getSymbolWeakMap();
    var cachedHashCode = hashCodeMap.get(value);
    if (cachedHashCode !== VOID)
      return cachedHashCode;
    var hash = calculateRandomHash();
    hashCodeMap.set(value, hash);
    return hash;
  }
  function symbolIsSharable(symbol) {
    return Symbol.keyFor(symbol) != VOID;
  }
  function getSymbolMap() {
    if (symbolMap === VOID) {
      symbolMap = new Map();
    }
    return symbolMap;
  }
  function getSymbolWeakMap() {
    if (symbolWeakMap === VOID) {
      symbolWeakMap = new WeakMap();
    }
    return symbolWeakMap;
  }
  var symbolMap;
  var symbolWeakMap;
  function equals(obj1, obj2) {
    if (obj1 == null) {
      return obj2 == null;
    }
    if (obj2 == null) {
      return false;
    }
    if (typeof obj1 === 'object' && typeof obj1.equals === 'function') {
      return obj1.equals(obj2);
    }
    if (obj1 !== obj1) {
      return obj2 !== obj2;
    }
    if (typeof obj1 === 'number' && typeof obj2 === 'number') {
      var tmp;
      if (obj1 === obj2) {
        var tmp_0;
        if (obj1 !== 0) {
          tmp_0 = true;
        } else {
          // Inline function 'kotlin.js.asDynamic' call
          var tmp_1 = 1 / obj1;
          // Inline function 'kotlin.js.asDynamic' call
          tmp_0 = tmp_1 === 1 / obj2;
        }
        tmp = tmp_0;
      } else {
        tmp = false;
      }
      return tmp;
    }
    return obj1 === obj2;
  }
  function unboxIntrinsic(x) {
    var message = 'Should be lowered';
    throw IllegalStateException_init_$Create$_0(toString_1(message));
  }
  function captureStack(instance, constructorFunction) {
    if (Error.captureStackTrace != null) {
      Error.captureStackTrace(instance, constructorFunction);
    } else {
      // Inline function 'kotlin.js.asDynamic' call
      instance.stack = (new Error()).stack;
    }
  }
  function protoOf(constructor) {
    return constructor.prototype;
  }
  function defineMessage(message, cause) {
    var tmp;
    if (isUndefined(message)) {
      var tmp_0;
      if (isUndefined(cause)) {
        tmp_0 = message;
      } else {
        var tmp1_elvis_lhs = cause == null ? null : cause.toString();
        tmp_0 = tmp1_elvis_lhs == null ? VOID : tmp1_elvis_lhs;
      }
      tmp = tmp_0;
    } else {
      tmp = message == null ? VOID : message;
    }
    return tmp;
  }
  function isUndefined(value) {
    return value === VOID;
  }
  function extendThrowable(this_, message, cause) {
    defineFieldOnInstance(this_, 'message', defineMessage(message, cause));
    defineFieldOnInstance(this_, 'cause', cause);
    defineFieldOnInstance(this_, 'name', Object.getPrototypeOf(this_).constructor.name);
  }
  function defineFieldOnInstance(this_, name, value) {
    Object.defineProperty(this_, name, {configurable: true, writable: true, value: value});
  }
  function ensureNotNull(v) {
    var tmp;
    if (v == null) {
      THROW_NPE();
    } else {
      tmp = v;
    }
    return tmp;
  }
  function THROW_NPE() {
    throw NullPointerException_init_$Create$();
  }
  function THROW_CCE() {
    throw ClassCastException_init_$Create$();
  }
  function THROW_IAE(msg) {
    throw IllegalArgumentException_init_$Create$_0(msg);
  }
  function get_ZERO() {
    _init_properties_longJs_kt__elc2w5();
    return ZERO;
  }
  var ZERO;
  function get_ONE() {
    _init_properties_longJs_kt__elc2w5();
    return ONE;
  }
  var ONE;
  function get_NEG_ONE() {
    _init_properties_longJs_kt__elc2w5();
    return NEG_ONE;
  }
  var NEG_ONE;
  function get_MAX_VALUE() {
    _init_properties_longJs_kt__elc2w5();
    return MAX_VALUE;
  }
  var MAX_VALUE;
  function get_MIN_VALUE() {
    _init_properties_longJs_kt__elc2w5();
    return MIN_VALUE;
  }
  var MIN_VALUE;
  function get_TWO_PWR_24_() {
    _init_properties_longJs_kt__elc2w5();
    return TWO_PWR_24_;
  }
  var TWO_PWR_24_;
  function compare(_this__u8e3s4, other) {
    _init_properties_longJs_kt__elc2w5();
    if (equalsLong(_this__u8e3s4, other)) {
      return 0;
    }
    var thisNeg = isNegative(_this__u8e3s4);
    var otherNeg = isNegative(other);
    return thisNeg && !otherNeg ? -1 : !thisNeg && otherNeg ? 1 : isNegative(subtract(_this__u8e3s4, other)) ? -1 : 1;
  }
  function add(_this__u8e3s4, other) {
    _init_properties_longJs_kt__elc2w5();
    var a48 = _this__u8e3s4.h1_1 >>> 16 | 0;
    var a32 = _this__u8e3s4.h1_1 & 65535;
    var a16 = _this__u8e3s4.g1_1 >>> 16 | 0;
    var a00 = _this__u8e3s4.g1_1 & 65535;
    var b48 = other.h1_1 >>> 16 | 0;
    var b32 = other.h1_1 & 65535;
    var b16 = other.g1_1 >>> 16 | 0;
    var b00 = other.g1_1 & 65535;
    var c48 = 0;
    var c32 = 0;
    var c16 = 0;
    var c00 = 0;
    c00 = c00 + (a00 + b00 | 0) | 0;
    c16 = c16 + (c00 >>> 16 | 0) | 0;
    c00 = c00 & 65535;
    c16 = c16 + (a16 + b16 | 0) | 0;
    c32 = c32 + (c16 >>> 16 | 0) | 0;
    c16 = c16 & 65535;
    c32 = c32 + (a32 + b32 | 0) | 0;
    c48 = c48 + (c32 >>> 16 | 0) | 0;
    c32 = c32 & 65535;
    c48 = c48 + (a48 + b48 | 0) | 0;
    c48 = c48 & 65535;
    return new Long(c16 << 16 | c00, c48 << 16 | c32);
  }
  function subtract(_this__u8e3s4, other) {
    _init_properties_longJs_kt__elc2w5();
    return add(_this__u8e3s4, other.l1());
  }
  function multiply(_this__u8e3s4, other) {
    _init_properties_longJs_kt__elc2w5();
    if (isZero(_this__u8e3s4)) {
      return get_ZERO();
    } else if (isZero(other)) {
      return get_ZERO();
    }
    if (equalsLong(_this__u8e3s4, get_MIN_VALUE())) {
      return isOdd(other) ? get_MIN_VALUE() : get_ZERO();
    } else if (equalsLong(other, get_MIN_VALUE())) {
      return isOdd(_this__u8e3s4) ? get_MIN_VALUE() : get_ZERO();
    }
    if (isNegative(_this__u8e3s4)) {
      var tmp;
      if (isNegative(other)) {
        tmp = multiply(negate(_this__u8e3s4), negate(other));
      } else {
        tmp = negate(multiply(negate(_this__u8e3s4), other));
      }
      return tmp;
    } else if (isNegative(other)) {
      return negate(multiply(_this__u8e3s4, negate(other)));
    }
    if (lessThan(_this__u8e3s4, get_TWO_PWR_24_()) && lessThan(other, get_TWO_PWR_24_())) {
      return fromNumber(toNumber(_this__u8e3s4) * toNumber(other));
    }
    var a48 = _this__u8e3s4.h1_1 >>> 16 | 0;
    var a32 = _this__u8e3s4.h1_1 & 65535;
    var a16 = _this__u8e3s4.g1_1 >>> 16 | 0;
    var a00 = _this__u8e3s4.g1_1 & 65535;
    var b48 = other.h1_1 >>> 16 | 0;
    var b32 = other.h1_1 & 65535;
    var b16 = other.g1_1 >>> 16 | 0;
    var b00 = other.g1_1 & 65535;
    var c48 = 0;
    var c32 = 0;
    var c16 = 0;
    var c00 = 0;
    c00 = c00 + imul(a00, b00) | 0;
    c16 = c16 + (c00 >>> 16 | 0) | 0;
    c00 = c00 & 65535;
    c16 = c16 + imul(a16, b00) | 0;
    c32 = c32 + (c16 >>> 16 | 0) | 0;
    c16 = c16 & 65535;
    c16 = c16 + imul(a00, b16) | 0;
    c32 = c32 + (c16 >>> 16 | 0) | 0;
    c16 = c16 & 65535;
    c32 = c32 + imul(a32, b00) | 0;
    c48 = c48 + (c32 >>> 16 | 0) | 0;
    c32 = c32 & 65535;
    c32 = c32 + imul(a16, b16) | 0;
    c48 = c48 + (c32 >>> 16 | 0) | 0;
    c32 = c32 & 65535;
    c32 = c32 + imul(a00, b32) | 0;
    c48 = c48 + (c32 >>> 16 | 0) | 0;
    c32 = c32 & 65535;
    c48 = c48 + (((imul(a48, b00) + imul(a32, b16) | 0) + imul(a16, b32) | 0) + imul(a00, b48) | 0) | 0;
    c48 = c48 & 65535;
    return new Long(c16 << 16 | c00, c48 << 16 | c32);
  }
  function divide(_this__u8e3s4, other) {
    _init_properties_longJs_kt__elc2w5();
    if (isZero(other)) {
      throw Exception_init_$Create$_0('division by zero');
    } else if (isZero(_this__u8e3s4)) {
      return get_ZERO();
    }
    if (equalsLong(_this__u8e3s4, get_MIN_VALUE())) {
      if (equalsLong(other, get_ONE()) || equalsLong(other, get_NEG_ONE())) {
        return get_MIN_VALUE();
      } else if (equalsLong(other, get_MIN_VALUE())) {
        return get_ONE();
      } else {
        var halfThis = shiftRight(_this__u8e3s4, 1);
        var approx = shiftLeft(halfThis.k1(other), 1);
        if (equalsLong(approx, get_ZERO())) {
          return isNegative(other) ? get_ONE() : get_NEG_ONE();
        } else {
          var rem = subtract(_this__u8e3s4, multiply(other, approx));
          return add(approx, rem.k1(other));
        }
      }
    } else if (equalsLong(other, get_MIN_VALUE())) {
      return get_ZERO();
    }
    if (isNegative(_this__u8e3s4)) {
      var tmp;
      if (isNegative(other)) {
        tmp = negate(_this__u8e3s4).k1(negate(other));
      } else {
        tmp = negate(negate(_this__u8e3s4).k1(other));
      }
      return tmp;
    } else if (isNegative(other)) {
      return negate(_this__u8e3s4.k1(negate(other)));
    }
    var res = get_ZERO();
    var rem_0 = _this__u8e3s4;
    while (greaterThanOrEqual(rem_0, other)) {
      var approxDouble = toNumber(rem_0) / toNumber(other);
      var approx2 = Math.max(1.0, Math.floor(approxDouble));
      var log2 = Math.ceil(Math.log(approx2) / Math.LN2);
      var delta = log2 <= 48 ? 1.0 : Math.pow(2.0, log2 - 48);
      var approxRes = fromNumber(approx2);
      var approxRem = multiply(approxRes, other);
      while (isNegative(approxRem) || greaterThan(approxRem, rem_0)) {
        approx2 = approx2 - delta;
        approxRes = fromNumber(approx2);
        approxRem = multiply(approxRes, other);
      }
      if (isZero(approxRes)) {
        approxRes = get_ONE();
      }
      res = add(res, approxRes);
      rem_0 = subtract(rem_0, approxRem);
    }
    return res;
  }
  function shiftLeft(_this__u8e3s4, numBits) {
    _init_properties_longJs_kt__elc2w5();
    var numBits_0 = numBits & 63;
    if (numBits_0 === 0) {
      return _this__u8e3s4;
    } else {
      if (numBits_0 < 32) {
        return new Long(_this__u8e3s4.g1_1 << numBits_0, _this__u8e3s4.h1_1 << numBits_0 | (_this__u8e3s4.g1_1 >>> (32 - numBits_0 | 0) | 0));
      } else {
        return new Long(0, _this__u8e3s4.g1_1 << (numBits_0 - 32 | 0));
      }
    }
  }
  function shiftRight(_this__u8e3s4, numBits) {
    _init_properties_longJs_kt__elc2w5();
    var numBits_0 = numBits & 63;
    if (numBits_0 === 0) {
      return _this__u8e3s4;
    } else {
      if (numBits_0 < 32) {
        return new Long(_this__u8e3s4.g1_1 >>> numBits_0 | 0 | _this__u8e3s4.h1_1 << (32 - numBits_0 | 0), _this__u8e3s4.h1_1 >> numBits_0);
      } else {
        return new Long(_this__u8e3s4.h1_1 >> (numBits_0 - 32 | 0), _this__u8e3s4.h1_1 >= 0 ? 0 : -1);
      }
    }
  }
  function toNumber(_this__u8e3s4) {
    _init_properties_longJs_kt__elc2w5();
    return _this__u8e3s4.h1_1 * 4.294967296E9 + getLowBitsUnsigned(_this__u8e3s4);
  }
  function toStringImpl(_this__u8e3s4, radix) {
    _init_properties_longJs_kt__elc2w5();
    if (radix < 2 || 36 < radix) {
      throw Exception_init_$Create$_0('radix out of range: ' + radix);
    }
    if (isZero(_this__u8e3s4)) {
      return '0';
    }
    if (isNegative(_this__u8e3s4)) {
      if (equalsLong(_this__u8e3s4, get_MIN_VALUE())) {
        var radixLong = fromInt(radix);
        var div = _this__u8e3s4.k1(radixLong);
        var rem = subtract(multiply(div, radixLong), _this__u8e3s4).n1();
        var tmp = toStringImpl(div, radix);
        // Inline function 'kotlin.js.asDynamic' call
        // Inline function 'kotlin.js.unsafeCast' call
        return tmp + rem.toString(radix);
      } else {
        return '-' + toStringImpl(negate(_this__u8e3s4), radix);
      }
    }
    var digitsPerTime = radix === 2 ? 31 : radix <= 10 ? 9 : radix <= 21 ? 7 : radix <= 35 ? 6 : 5;
    var radixToPower = fromNumber(Math.pow(radix, digitsPerTime));
    var rem_0 = _this__u8e3s4;
    var result = '';
    while (true) {
      var remDiv = rem_0.k1(radixToPower);
      var intval = subtract(rem_0, multiply(remDiv, radixToPower)).n1();
      // Inline function 'kotlin.js.asDynamic' call
      // Inline function 'kotlin.js.unsafeCast' call
      var digits = intval.toString(radix);
      rem_0 = remDiv;
      if (isZero(rem_0)) {
        return digits + result;
      } else {
        while (digits.length < digitsPerTime) {
          digits = '0' + digits;
        }
        result = digits + result;
      }
    }
  }
  function equalsLong(_this__u8e3s4, other) {
    _init_properties_longJs_kt__elc2w5();
    return _this__u8e3s4.h1_1 === other.h1_1 && _this__u8e3s4.g1_1 === other.g1_1;
  }
  function hashCode_0(l) {
    _init_properties_longJs_kt__elc2w5();
    return l.g1_1 ^ l.h1_1;
  }
  function fromInt(value) {
    _init_properties_longJs_kt__elc2w5();
    return new Long(value, value < 0 ? -1 : 0);
  }
  function isNegative(_this__u8e3s4) {
    _init_properties_longJs_kt__elc2w5();
    return _this__u8e3s4.h1_1 < 0;
  }
  function isZero(_this__u8e3s4) {
    _init_properties_longJs_kt__elc2w5();
    return _this__u8e3s4.h1_1 === 0 && _this__u8e3s4.g1_1 === 0;
  }
  function isOdd(_this__u8e3s4) {
    _init_properties_longJs_kt__elc2w5();
    return (_this__u8e3s4.g1_1 & 1) === 1;
  }
  function negate(_this__u8e3s4) {
    _init_properties_longJs_kt__elc2w5();
    return _this__u8e3s4.l1();
  }
  function lessThan(_this__u8e3s4, other) {
    _init_properties_longJs_kt__elc2w5();
    return compare(_this__u8e3s4, other) < 0;
  }
  function fromNumber(value) {
    _init_properties_longJs_kt__elc2w5();
    if (isNaN_0(value)) {
      return get_ZERO();
    } else if (value <= -9.223372036854776E18) {
      return get_MIN_VALUE();
    } else if (value + 1 >= 9.223372036854776E18) {
      return get_MAX_VALUE();
    } else if (value < 0) {
      return negate(fromNumber(-value));
    } else {
      var twoPwr32 = 4.294967296E9;
      // Inline function 'kotlin.js.jsBitwiseOr' call
      var tmp = value % twoPwr32 | 0;
      // Inline function 'kotlin.js.jsBitwiseOr' call
      var tmp$ret$1 = value / twoPwr32 | 0;
      return new Long(tmp, tmp$ret$1);
    }
  }
  function greaterThan(_this__u8e3s4, other) {
    _init_properties_longJs_kt__elc2w5();
    return compare(_this__u8e3s4, other) > 0;
  }
  function greaterThanOrEqual(_this__u8e3s4, other) {
    _init_properties_longJs_kt__elc2w5();
    return compare(_this__u8e3s4, other) >= 0;
  }
  function getLowBitsUnsigned(_this__u8e3s4) {
    _init_properties_longJs_kt__elc2w5();
    return _this__u8e3s4.g1_1 >= 0 ? _this__u8e3s4.g1_1 : 4.294967296E9 + _this__u8e3s4.g1_1;
  }
  var properties_initialized_longJs_kt_4syf89;
  function _init_properties_longJs_kt__elc2w5() {
    if (!properties_initialized_longJs_kt_4syf89) {
      properties_initialized_longJs_kt_4syf89 = true;
      ZERO = fromInt(0);
      ONE = fromInt(1);
      NEG_ONE = fromInt(-1);
      MAX_VALUE = new Long(-1, 2147483647);
      MIN_VALUE = new Long(0, -2147483648);
      TWO_PWR_24_ = fromInt(16777216);
    }
  }
  function createMetadata(kind, name, defaultConstructor, associatedObjectKey, associatedObjects, suspendArity) {
    var undef = VOID;
    var iid = kind === 'interface' ? generateInterfaceId() : VOID;
    return {kind: kind, simpleName: name, associatedObjectKey: associatedObjectKey, associatedObjects: associatedObjects, suspendArity: suspendArity, $kClass$: undef, defaultConstructor: defaultConstructor, iid: iid};
  }
  function generateInterfaceId() {
    if (globalInterfaceId === VOID) {
      globalInterfaceId = 0;
    }
    // Inline function 'kotlin.js.unsafeCast' call
    globalInterfaceId = globalInterfaceId + 1 | 0;
    // Inline function 'kotlin.js.unsafeCast' call
    return globalInterfaceId;
  }
  var globalInterfaceId;
  function initMetadataFor(kind, ctor, name, defaultConstructor, parent, interfaces, suspendArity, associatedObjectKey, associatedObjects) {
    if (!(parent == null)) {
      ctor.prototype = Object.create(parent.prototype);
      ctor.prototype.constructor = ctor;
    }
    var metadata = createMetadata(kind, name, defaultConstructor, associatedObjectKey, associatedObjects, suspendArity);
    ctor.$metadata$ = metadata;
    if (!(interfaces == null)) {
      var receiver = !equals(metadata.iid, VOID) ? ctor : ctor.prototype;
      receiver.$imask$ = implement(interfaces);
    }
  }
  function initMetadataForClass(ctor, name, defaultConstructor, parent, interfaces, suspendArity, associatedObjectKey, associatedObjects) {
    var kind = 'class';
    initMetadataFor(kind, ctor, name, defaultConstructor, parent, interfaces, suspendArity, associatedObjectKey, associatedObjects);
  }
  function initMetadataForObject(ctor, name, defaultConstructor, parent, interfaces, suspendArity, associatedObjectKey, associatedObjects) {
    var kind = 'object';
    initMetadataFor(kind, ctor, name, defaultConstructor, parent, interfaces, suspendArity, associatedObjectKey, associatedObjects);
  }
  function initMetadataForInterface(ctor, name, defaultConstructor, parent, interfaces, suspendArity, associatedObjectKey, associatedObjects) {
    var kind = 'interface';
    initMetadataFor(kind, ctor, name, defaultConstructor, parent, interfaces, suspendArity, associatedObjectKey, associatedObjects);
  }
  function initMetadataForLambda(ctor, parent, interfaces, suspendArity) {
    initMetadataForClass(ctor, 'Lambda', VOID, parent, interfaces, suspendArity, VOID, VOID);
  }
  function initMetadataForCoroutine(ctor, parent, interfaces, suspendArity) {
    initMetadataForClass(ctor, 'Coroutine', VOID, parent, interfaces, suspendArity, VOID, VOID);
  }
  function initMetadataForFunctionReference(ctor, parent, interfaces, suspendArity) {
    initMetadataForClass(ctor, 'FunctionReference', VOID, parent, interfaces, suspendArity, VOID, VOID);
  }
  function initMetadataForCompanion(ctor, parent, interfaces, suspendArity) {
    initMetadataForObject(ctor, 'Companion', VOID, parent, interfaces, suspendArity, VOID, VOID);
  }
  function numberToInt(a) {
    var tmp;
    if (a instanceof Long) {
      tmp = a.n1();
    } else {
      tmp = doubleToInt(a);
    }
    return tmp;
  }
  function doubleToInt(a) {
    var tmp;
    if (a > 2147483647) {
      tmp = 2147483647;
    } else if (a < -2147483648) {
      tmp = -2147483648;
    } else {
      // Inline function 'kotlin.js.jsBitwiseOr' call
      tmp = a | 0;
    }
    return tmp;
  }
  function numberToDouble(a) {
    // Inline function 'kotlin.js.unsafeCast' call
    return +a;
  }
  function isArrayish(o) {
    return isJsArray(o) || isView(o);
  }
  function isJsArray(obj) {
    // Inline function 'kotlin.js.unsafeCast' call
    return Array.isArray(obj);
  }
  function isInterface(obj, iface) {
    return isInterfaceImpl(obj, iface.$metadata$.iid);
  }
  function isInterfaceImpl(obj, iface) {
    // Inline function 'kotlin.js.unsafeCast' call
    var tmp0_elvis_lhs = obj.$imask$;
    var tmp;
    if (tmp0_elvis_lhs == null) {
      return false;
    } else {
      tmp = tmp0_elvis_lhs;
    }
    var mask = tmp;
    return isBitSet(mask, iface);
  }
  function isNumber(a) {
    var tmp;
    if (typeof a === 'number') {
      tmp = true;
    } else {
      tmp = a instanceof Long;
    }
    return tmp;
  }
  function isCharSequence(value) {
    return typeof value === 'string' || isInterface(value, CharSequence);
  }
  function get_VOID() {
    _init_properties_void_kt__3zg9as();
    return VOID;
  }
  var VOID;
  var properties_initialized_void_kt_e4ret2;
  function _init_properties_void_kt__3zg9as() {
    if (!properties_initialized_void_kt_e4ret2) {
      properties_initialized_void_kt_e4ret2 = true;
      VOID = void 0;
    }
  }
  function asList(_this__u8e3s4) {
    // Inline function 'kotlin.js.unsafeCast' call
    // Inline function 'kotlin.js.asDynamic' call
    return new ArrayList(_this__u8e3s4);
  }
  function copyOf(_this__u8e3s4, newSize) {
    // Inline function 'kotlin.require' call
    if (!(newSize >= 0)) {
      var message = 'Invalid new array size: ' + newSize + '.';
      throw IllegalArgumentException_init_$Create$_0(toString_1(message));
    }
    return fillFrom(_this__u8e3s4, new Int32Array(newSize));
  }
  function copyOf_0(_this__u8e3s4, newSize) {
    // Inline function 'kotlin.require' call
    if (!(newSize >= 0)) {
      var message = 'Invalid new array size: ' + newSize + '.';
      throw IllegalArgumentException_init_$Create$_0(toString_1(message));
    }
    return arrayCopyResize(_this__u8e3s4, newSize, null);
  }
  function isNaN_0(_this__u8e3s4) {
    return !(_this__u8e3s4 === _this__u8e3s4);
  }
  function isFinite(_this__u8e3s4) {
    return !isInfinite(_this__u8e3s4) && !isNaN_0(_this__u8e3s4);
  }
  function isInfinite(_this__u8e3s4) {
    return _this__u8e3s4 === Infinity || _this__u8e3s4 === -Infinity;
  }
  function takeHighestOneBit(_this__u8e3s4) {
    var tmp;
    if (_this__u8e3s4 === 0) {
      tmp = 0;
    } else {
      // Inline function 'kotlin.countLeadingZeroBits' call
      tmp = 1 << (31 - clz32(_this__u8e3s4) | 0);
    }
    return tmp;
  }
  function Unit() {
  }
  protoOf(Unit).toString = function () {
    return 'kotlin.Unit';
  };
  var Unit_instance;
  function Unit_getInstance() {
    return Unit_instance;
  }
  function collectionToArray(collection) {
    return collectionToArrayCommonImpl(collection);
  }
  function mapCapacity(expectedSize) {
    return expectedSize;
  }
  function AbstractMutableCollection() {
    AbstractCollection.call(this);
  }
  protoOf(AbstractMutableCollection).toJSON = function () {
    return this.toArray();
  };
  function IteratorImpl($outer) {
    this.e2_1 = $outer;
    this.c2_1 = 0;
    this.d2_1 = -1;
  }
  protoOf(IteratorImpl).c = function () {
    return this.c2_1 < this.e2_1.g();
  };
  protoOf(IteratorImpl).d = function () {
    if (!this.c())
      throw NoSuchElementException_init_$Create$();
    var tmp = this;
    var _unary__edvuaz = this.c2_1;
    this.c2_1 = _unary__edvuaz + 1 | 0;
    tmp.d2_1 = _unary__edvuaz;
    return this.e2_1.f(this.d2_1);
  };
  function ListIteratorImpl($outer, index) {
    this.i2_1 = $outer;
    IteratorImpl.call(this, $outer);
    Companion_instance_6.k2(index, this.i2_1.g());
    this.c2_1 = index;
  }
  protoOf(ListIteratorImpl).l2 = function () {
    return this.c2_1 > 0;
  };
  protoOf(ListIteratorImpl).m2 = function () {
    return this.c2_1;
  };
  protoOf(ListIteratorImpl).n2 = function () {
    if (!this.l2())
      throw NoSuchElementException_init_$Create$();
    var tmp = this;
    this.c2_1 = this.c2_1 - 1 | 0;
    tmp.d2_1 = this.c2_1;
    return this.i2_1.f(this.d2_1);
  };
  function SubList(list, fromIndex, toIndex) {
    AbstractMutableList.call(this);
    this.p2_1 = list;
    this.q2_1 = fromIndex;
    this.r2_1 = 0;
    Companion_instance_6.s2(this.q2_1, toIndex, this.p2_1.g());
    this.r2_1 = toIndex - this.q2_1 | 0;
  }
  protoOf(SubList).f = function (index) {
    Companion_instance_6.t2(index, this.r2_1);
    return this.p2_1.f(this.q2_1 + index | 0);
  };
  protoOf(SubList).g = function () {
    return this.r2_1;
  };
  function AbstractMutableList() {
    AbstractMutableCollection.call(this);
    this.u2_1 = 0;
  }
  protoOf(AbstractMutableList).b = function () {
    return new IteratorImpl(this);
  };
  protoOf(AbstractMutableList).h = function (element) {
    return this.j(element) >= 0;
  };
  protoOf(AbstractMutableList).j = function (element) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.indexOfFirst' call
      var index = 0;
      var _iterator__ex2g4s = this.b();
      while (_iterator__ex2g4s.c()) {
        var item = _iterator__ex2g4s.d();
        if (equals(item, element)) {
          tmp$ret$1 = index;
          break $l$block;
        }
        index = index + 1 | 0;
      }
      tmp$ret$1 = -1;
    }
    return tmp$ret$1;
  };
  protoOf(AbstractMutableList).k = function (element) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.indexOfLast' call
      var iterator = this.m(this.g());
      while (iterator.l2()) {
        var it = iterator.n2();
        if (equals(it, element)) {
          tmp$ret$1 = iterator.m2();
          break $l$block;
        }
      }
      tmp$ret$1 = -1;
    }
    return tmp$ret$1;
  };
  protoOf(AbstractMutableList).l = function () {
    return this.m(0);
  };
  protoOf(AbstractMutableList).m = function (index) {
    return new ListIteratorImpl(this, index);
  };
  protoOf(AbstractMutableList).n = function (fromIndex, toIndex) {
    return new SubList(this, fromIndex, toIndex);
  };
  protoOf(AbstractMutableList).equals = function (other) {
    if (other === this)
      return true;
    if (!(!(other == null) ? isInterface(other, KtList) : false))
      return false;
    return Companion_instance_6.v2(this, other);
  };
  protoOf(AbstractMutableList).hashCode = function () {
    return Companion_instance_6.w2(this);
  };
  function AbstractMutableMap() {
    AbstractMap.call(this);
    this.z2_1 = null;
    this.a3_1 = null;
  }
  protoOf(AbstractMutableMap).b3 = function () {
    return new HashMapKeysDefault(this);
  };
  protoOf(AbstractMutableMap).c3 = function () {
    return new HashMapValuesDefault(this);
  };
  protoOf(AbstractMutableMap).t = function () {
    var tmp0_elvis_lhs = this.z2_1;
    var tmp;
    if (tmp0_elvis_lhs == null) {
      // Inline function 'kotlin.also' call
      var this_0 = this.b3();
      this.z2_1 = this_0;
      tmp = this_0;
    } else {
      tmp = tmp0_elvis_lhs;
    }
    return tmp;
  };
  protoOf(AbstractMutableMap).u = function () {
    var tmp0_elvis_lhs = this.a3_1;
    var tmp;
    if (tmp0_elvis_lhs == null) {
      // Inline function 'kotlin.also' call
      var this_0 = this.c3();
      this.a3_1 = this_0;
      tmp = this_0;
    } else {
      tmp = tmp0_elvis_lhs;
    }
    return tmp;
  };
  function AbstractMutableSet() {
    AbstractMutableCollection.call(this);
  }
  protoOf(AbstractMutableSet).equals = function (other) {
    if (other === this)
      return true;
    if (!(!(other == null) ? isInterface(other, KtSet) : false))
      return false;
    return Companion_instance_8.g3(this, other);
  };
  protoOf(AbstractMutableSet).hashCode = function () {
    return Companion_instance_8.h3(this);
  };
  function arrayOfUninitializedElements(capacity) {
    // Inline function 'kotlin.require' call
    if (!(capacity >= 0)) {
      var message = 'capacity must be non-negative.';
      throw IllegalArgumentException_init_$Create$_0(toString_1(message));
    }
    // Inline function 'kotlin.arrayOfNulls' call
    // Inline function 'kotlin.js.unsafeCast' call
    // Inline function 'kotlin.js.asDynamic' call
    return Array(capacity);
  }
  function resetRange(_this__u8e3s4, fromIndex, toIndex) {
    // Inline function 'kotlin.js.nativeFill' call
    // Inline function 'kotlin.js.asDynamic' call
    _this__u8e3s4.fill(null, fromIndex, toIndex);
  }
  function copyOfUninitializedElements(_this__u8e3s4, newSize) {
    // Inline function 'kotlin.js.unsafeCast' call
    // Inline function 'kotlin.js.asDynamic' call
    return copyOf_0(_this__u8e3s4, newSize);
  }
  function Companion_4() {
    Companion_instance_4 = this;
    var tmp = this;
    // Inline function 'kotlin.also' call
    var this_0 = ArrayList_init_$Create$_0(0);
    this_0.r1_1 = true;
    tmp.i3_1 = this_0;
  }
  var Companion_instance_4;
  function Companion_getInstance_4() {
    if (Companion_instance_4 == null)
      new Companion_4();
    return Companion_instance_4;
  }
  function ArrayList_init_$Init$($this) {
    // Inline function 'kotlin.emptyArray' call
    var tmp$ret$0 = [];
    ArrayList.call($this, tmp$ret$0);
    return $this;
  }
  function ArrayList_init_$Create$() {
    return ArrayList_init_$Init$(objectCreate(protoOf(ArrayList)));
  }
  function ArrayList_init_$Init$_0(initialCapacity, $this) {
    // Inline function 'kotlin.emptyArray' call
    var tmp$ret$0 = [];
    ArrayList.call($this, tmp$ret$0);
    // Inline function 'kotlin.require' call
    if (!(initialCapacity >= 0)) {
      var message = 'Negative initial capacity: ' + initialCapacity;
      throw IllegalArgumentException_init_$Create$_0(toString_1(message));
    }
    return $this;
  }
  function ArrayList_init_$Create$_0(initialCapacity) {
    return ArrayList_init_$Init$_0(initialCapacity, objectCreate(protoOf(ArrayList)));
  }
  function rangeCheck($this, index) {
    // Inline function 'kotlin.apply' call
    Companion_instance_6.t2(index, $this.g());
    return index;
  }
  function ArrayList(array) {
    Companion_getInstance_4();
    AbstractMutableList.call(this);
    this.q1_1 = array;
    this.r1_1 = false;
  }
  protoOf(ArrayList).s1 = function () {
    this.j3();
    this.r1_1 = true;
    return this.g() > 0 ? this : Companion_getInstance_4().i3_1;
  };
  protoOf(ArrayList).g = function () {
    return this.q1_1.length;
  };
  protoOf(ArrayList).f = function (index) {
    var tmp = this.q1_1[rangeCheck(this, index)];
    return (tmp == null ? true : !(tmp == null)) ? tmp : THROW_CCE();
  };
  protoOf(ArrayList).j = function (element) {
    return indexOf(this.q1_1, element);
  };
  protoOf(ArrayList).k = function (element) {
    return lastIndexOf(this.q1_1, element);
  };
  protoOf(ArrayList).toString = function () {
    return arrayToString(this.q1_1);
  };
  protoOf(ArrayList).k3 = function () {
    return [].slice.call(this.q1_1);
  };
  protoOf(ArrayList).toArray = function () {
    return this.k3();
  };
  protoOf(ArrayList).j3 = function () {
    if (this.r1_1)
      throw UnsupportedOperationException_init_$Create$();
  };
  function HashMap_init_$Init$(internalMap, $this) {
    AbstractMutableMap.call($this);
    HashMap.call($this);
    $this.p3_1 = internalMap;
    return $this;
  }
  function HashMap_init_$Init$_0($this) {
    HashMap_init_$Init$(InternalHashMap_init_$Create$(), $this);
    return $this;
  }
  function HashMap_init_$Create$() {
    return HashMap_init_$Init$_0(objectCreate(protoOf(HashMap)));
  }
  function HashMap_init_$Init$_1(initialCapacity, loadFactor, $this) {
    HashMap_init_$Init$(InternalHashMap_init_$Create$_1(initialCapacity, loadFactor), $this);
    return $this;
  }
  function HashMap_init_$Init$_2(initialCapacity, $this) {
    HashMap_init_$Init$_1(initialCapacity, 1.0, $this);
    return $this;
  }
  protoOf(HashMap).q = function (key) {
    return this.p3_1.r3(key);
  };
  protoOf(HashMap).r = function (value) {
    return this.p3_1.r(value);
  };
  protoOf(HashMap).b3 = function () {
    return new HashMapKeys(this.p3_1);
  };
  protoOf(HashMap).c3 = function () {
    return new HashMapValues(this.p3_1);
  };
  protoOf(HashMap).v = function () {
    var tmp0_elvis_lhs = this.q3_1;
    var tmp;
    if (tmp0_elvis_lhs == null) {
      // Inline function 'kotlin.also' call
      var this_0 = new HashMapEntrySet(this.p3_1);
      this.q3_1 = this_0;
      tmp = this_0;
    } else {
      tmp = tmp0_elvis_lhs;
    }
    return tmp;
  };
  protoOf(HashMap).s = function (key) {
    return this.p3_1.s(key);
  };
  protoOf(HashMap).b2 = function (key, value) {
    return this.p3_1.b2(key, value);
  };
  protoOf(HashMap).g = function () {
    return this.p3_1.g();
  };
  function HashMap() {
    this.q3_1 = null;
  }
  function HashMapKeys(backing) {
    AbstractMutableSet.call(this);
    this.s3_1 = backing;
  }
  protoOf(HashMapKeys).g = function () {
    return this.s3_1.g();
  };
  protoOf(HashMapKeys).e = function () {
    return this.s3_1.g() === 0;
  };
  protoOf(HashMapKeys).h = function (element) {
    return this.s3_1.r3(element);
  };
  protoOf(HashMapKeys).a2 = function (element) {
    throw UnsupportedOperationException_init_$Create$();
  };
  protoOf(HashMapKeys).b = function () {
    return this.s3_1.t3();
  };
  function HashMapValues(backing) {
    AbstractMutableCollection.call(this);
    this.u3_1 = backing;
  }
  protoOf(HashMapValues).g = function () {
    return this.u3_1.g();
  };
  protoOf(HashMapValues).e = function () {
    return this.u3_1.g() === 0;
  };
  protoOf(HashMapValues).v3 = function (element) {
    return this.u3_1.r(element);
  };
  protoOf(HashMapValues).h = function (element) {
    if (!(element == null ? true : !(element == null)))
      return false;
    return this.v3((element == null ? true : !(element == null)) ? element : THROW_CCE());
  };
  protoOf(HashMapValues).b = function () {
    return this.u3_1.w3();
  };
  function HashMapEntrySet(backing) {
    HashMapEntrySetBase.call(this, backing);
  }
  protoOf(HashMapEntrySet).b = function () {
    return this.y3_1.z3();
  };
  function HashMapEntrySetBase(backing) {
    AbstractMutableSet.call(this);
    this.y3_1 = backing;
  }
  protoOf(HashMapEntrySetBase).g = function () {
    return this.y3_1.g();
  };
  protoOf(HashMapEntrySetBase).e = function () {
    return this.y3_1.g() === 0;
  };
  protoOf(HashMapEntrySetBase).a4 = function (element) {
    return this.y3_1.c4(element);
  };
  protoOf(HashMapEntrySetBase).h = function (element) {
    if (!(!(element == null) ? isInterface(element, Entry) : false))
      return false;
    return this.a4((!(element == null) ? isInterface(element, Entry) : false) ? element : THROW_CCE());
  };
  protoOf(HashMapEntrySetBase).b4 = function (element) {
    throw UnsupportedOperationException_init_$Create$();
  };
  protoOf(HashMapEntrySetBase).a2 = function (element) {
    return this.b4((!(element == null) ? isInterface(element, Entry) : false) ? element : THROW_CCE());
  };
  protoOf(HashMapEntrySetBase).i = function (elements) {
    return this.y3_1.d4(elements);
  };
  function HashMapKeysDefault$iterator$1($entryIterator) {
    this.e4_1 = $entryIterator;
  }
  protoOf(HashMapKeysDefault$iterator$1).c = function () {
    return this.e4_1.c();
  };
  protoOf(HashMapKeysDefault$iterator$1).d = function () {
    return this.e4_1.d().o();
  };
  function HashMapKeysDefault(backingMap) {
    AbstractMutableSet.call(this);
    this.f4_1 = backingMap;
  }
  protoOf(HashMapKeysDefault).g4 = function (element) {
    throw UnsupportedOperationException_init_$Create$_0('Add is not supported on keys');
  };
  protoOf(HashMapKeysDefault).a2 = function (element) {
    return this.g4((element == null ? true : !(element == null)) ? element : THROW_CCE());
  };
  protoOf(HashMapKeysDefault).r3 = function (element) {
    return this.f4_1.q(element);
  };
  protoOf(HashMapKeysDefault).h = function (element) {
    if (!(element == null ? true : !(element == null)))
      return false;
    return this.r3((element == null ? true : !(element == null)) ? element : THROW_CCE());
  };
  protoOf(HashMapKeysDefault).b = function () {
    var entryIterator = this.f4_1.v().b();
    return new HashMapKeysDefault$iterator$1(entryIterator);
  };
  protoOf(HashMapKeysDefault).g = function () {
    return this.f4_1.g();
  };
  function HashMapValuesDefault$iterator$1($entryIterator) {
    this.h4_1 = $entryIterator;
  }
  protoOf(HashMapValuesDefault$iterator$1).c = function () {
    return this.h4_1.c();
  };
  protoOf(HashMapValuesDefault$iterator$1).d = function () {
    return this.h4_1.d().p();
  };
  function HashMapValuesDefault(backingMap) {
    AbstractMutableCollection.call(this);
    this.i4_1 = backingMap;
  }
  protoOf(HashMapValuesDefault).v3 = function (element) {
    return this.i4_1.r(element);
  };
  protoOf(HashMapValuesDefault).h = function (element) {
    if (!(element == null ? true : !(element == null)))
      return false;
    return this.v3((element == null ? true : !(element == null)) ? element : THROW_CCE());
  };
  protoOf(HashMapValuesDefault).b = function () {
    var entryIterator = this.i4_1.v().b();
    return new HashMapValuesDefault$iterator$1(entryIterator);
  };
  protoOf(HashMapValuesDefault).g = function () {
    return this.i4_1.g();
  };
  function HashSet_init_$Init$(map, $this) {
    AbstractMutableSet.call($this);
    HashSet.call($this);
    $this.j4_1 = map;
    return $this;
  }
  function HashSet_init_$Init$_0($this) {
    HashSet_init_$Init$(InternalHashMap_init_$Create$(), $this);
    return $this;
  }
  function HashSet_init_$Create$() {
    return HashSet_init_$Init$_0(objectCreate(protoOf(HashSet)));
  }
  protoOf(HashSet).a2 = function (element) {
    return this.j4_1.b2(element, true) == null;
  };
  protoOf(HashSet).h = function (element) {
    return this.j4_1.r3(element);
  };
  protoOf(HashSet).e = function () {
    return this.j4_1.g() === 0;
  };
  protoOf(HashSet).b = function () {
    return this.j4_1.t3();
  };
  protoOf(HashSet).g = function () {
    return this.j4_1.g();
  };
  function HashSet() {
  }
  function computeHashSize($this, capacity) {
    return takeHighestOneBit(imul(coerceAtLeast(capacity, 1), 3));
  }
  function computeShift($this, hashSize) {
    // Inline function 'kotlin.countLeadingZeroBits' call
    return clz32(hashSize) + 1 | 0;
  }
  function checkForComodification($this) {
    if (!($this.u4_1.r4_1 === $this.w4_1))
      throw ConcurrentModificationException_init_$Create$_0('The backing map has been modified after this entry was obtained.');
  }
  function InternalHashMap_init_$Init$($this) {
    InternalHashMap_init_$Init$_0(8, $this);
    return $this;
  }
  function InternalHashMap_init_$Create$() {
    return InternalHashMap_init_$Init$(objectCreate(protoOf(InternalHashMap)));
  }
  function InternalHashMap_init_$Init$_0(initialCapacity, $this) {
    InternalHashMap.call($this, arrayOfUninitializedElements(initialCapacity), null, new Int32Array(initialCapacity), new Int32Array(computeHashSize(Companion_instance_5, initialCapacity)), 2, 0);
    return $this;
  }
  function InternalHashMap_init_$Create$_0(initialCapacity) {
    return InternalHashMap_init_$Init$_0(initialCapacity, objectCreate(protoOf(InternalHashMap)));
  }
  function InternalHashMap_init_$Init$_1(initialCapacity, loadFactor, $this) {
    InternalHashMap_init_$Init$_0(initialCapacity, $this);
    // Inline function 'kotlin.require' call
    if (!(loadFactor > 0)) {
      var message = 'Non-positive load factor: ' + loadFactor;
      throw IllegalArgumentException_init_$Create$_0(toString_1(message));
    }
    return $this;
  }
  function InternalHashMap_init_$Create$_1(initialCapacity, loadFactor) {
    return InternalHashMap_init_$Init$_1(initialCapacity, loadFactor, objectCreate(protoOf(InternalHashMap)));
  }
  function _get_capacity__a9k9f3($this) {
    return $this.k4_1.length;
  }
  function _get_hashSize__tftcho($this) {
    return $this.n4_1.length;
  }
  function registerModification($this) {
    $this.r4_1 = $this.r4_1 + 1 | 0;
  }
  function ensureExtraCapacity($this, n) {
    if (shouldCompact($this, n)) {
      compact($this, true);
    } else {
      ensureCapacity($this, $this.p4_1 + n | 0);
    }
  }
  function shouldCompact($this, extraCapacity) {
    var spareCapacity = _get_capacity__a9k9f3($this) - $this.p4_1 | 0;
    var gaps = $this.p4_1 - $this.g() | 0;
    return spareCapacity < extraCapacity && (gaps + spareCapacity | 0) >= extraCapacity && gaps >= (_get_capacity__a9k9f3($this) / 4 | 0);
  }
  function ensureCapacity($this, minCapacity) {
    if (minCapacity < 0)
      throw RuntimeException_init_$Create$_0('too many elements');
    if (minCapacity > _get_capacity__a9k9f3($this)) {
      var newSize = Companion_instance_6.x4(_get_capacity__a9k9f3($this), minCapacity);
      $this.k4_1 = copyOfUninitializedElements($this.k4_1, newSize);
      var tmp = $this;
      var tmp0_safe_receiver = $this.l4_1;
      tmp.l4_1 = tmp0_safe_receiver == null ? null : copyOfUninitializedElements(tmp0_safe_receiver, newSize);
      $this.m4_1 = copyOf($this.m4_1, newSize);
      var newHashSize = computeHashSize(Companion_instance_5, newSize);
      if (newHashSize > _get_hashSize__tftcho($this)) {
        rehash($this, newHashSize);
      }
    }
  }
  function allocateValuesArray($this) {
    var curValuesArray = $this.l4_1;
    if (!(curValuesArray == null))
      return curValuesArray;
    var newValuesArray = arrayOfUninitializedElements(_get_capacity__a9k9f3($this));
    $this.l4_1 = newValuesArray;
    return newValuesArray;
  }
  function hash($this, key) {
    return key == null ? 0 : imul(hashCode(key), -1640531527) >>> $this.q4_1 | 0;
  }
  function compact($this, updateHashArray) {
    var i = 0;
    var j = 0;
    var valuesArray = $this.l4_1;
    while (i < $this.p4_1) {
      var hash = $this.m4_1[i];
      if (hash >= 0) {
        $this.k4_1[j] = $this.k4_1[i];
        if (!(valuesArray == null)) {
          valuesArray[j] = valuesArray[i];
        }
        if (updateHashArray) {
          $this.m4_1[j] = hash;
          $this.n4_1[hash] = j + 1 | 0;
        }
        j = j + 1 | 0;
      }
      i = i + 1 | 0;
    }
    resetRange($this.k4_1, j, $this.p4_1);
    if (valuesArray == null)
      null;
    else {
      resetRange(valuesArray, j, $this.p4_1);
    }
    $this.p4_1 = j;
  }
  function rehash($this, newHashSize) {
    registerModification($this);
    if ($this.p4_1 > $this.s4_1) {
      compact($this, false);
    }
    $this.n4_1 = new Int32Array(newHashSize);
    $this.q4_1 = computeShift(Companion_instance_5, newHashSize);
    var i = 0;
    while (i < $this.p4_1) {
      var _unary__edvuaz = i;
      i = _unary__edvuaz + 1 | 0;
      if (!putRehash($this, _unary__edvuaz)) {
        throw IllegalStateException_init_$Create$_0('This cannot happen with fixed magic multiplier and grow-only hash array. Have object hashCodes changed?');
      }
    }
  }
  function putRehash($this, i) {
    var hash_0 = hash($this, $this.k4_1[i]);
    var probesLeft = $this.o4_1;
    while (true) {
      var index = $this.n4_1[hash_0];
      if (index === 0) {
        $this.n4_1[hash_0] = i + 1 | 0;
        $this.m4_1[i] = hash_0;
        return true;
      }
      probesLeft = probesLeft - 1 | 0;
      if (probesLeft < 0)
        return false;
      var _unary__edvuaz = hash_0;
      hash_0 = _unary__edvuaz - 1 | 0;
      if (_unary__edvuaz === 0)
        hash_0 = _get_hashSize__tftcho($this) - 1 | 0;
    }
  }
  function findKey($this, key) {
    var hash_0 = hash($this, key);
    var probesLeft = $this.o4_1;
    while (true) {
      var index = $this.n4_1[hash_0];
      if (index === 0)
        return -1;
      if (index > 0 && equals($this.k4_1[index - 1 | 0], key))
        return index - 1 | 0;
      probesLeft = probesLeft - 1 | 0;
      if (probesLeft < 0)
        return -1;
      var _unary__edvuaz = hash_0;
      hash_0 = _unary__edvuaz - 1 | 0;
      if (_unary__edvuaz === 0)
        hash_0 = _get_hashSize__tftcho($this) - 1 | 0;
    }
  }
  function findValue($this, value) {
    var i = $this.p4_1;
    $l$loop: while (true) {
      i = i - 1 | 0;
      if (!(i >= 0)) {
        break $l$loop;
      }
      if ($this.m4_1[i] >= 0 && equals(ensureNotNull($this.l4_1)[i], value))
        return i;
    }
    return -1;
  }
  function addKey($this, key) {
    $this.y4();
    retry: while (true) {
      var hash_0 = hash($this, key);
      var tentativeMaxProbeDistance = coerceAtMost(imul($this.o4_1, 2), _get_hashSize__tftcho($this) / 2 | 0);
      var probeDistance = 0;
      while (true) {
        var index = $this.n4_1[hash_0];
        if (index <= 0) {
          if ($this.p4_1 >= _get_capacity__a9k9f3($this)) {
            ensureExtraCapacity($this, 1);
            continue retry;
          }
          var _unary__edvuaz = $this.p4_1;
          $this.p4_1 = _unary__edvuaz + 1 | 0;
          var putIndex = _unary__edvuaz;
          $this.k4_1[putIndex] = key;
          $this.m4_1[putIndex] = hash_0;
          $this.n4_1[hash_0] = putIndex + 1 | 0;
          $this.s4_1 = $this.s4_1 + 1 | 0;
          registerModification($this);
          if (probeDistance > $this.o4_1)
            $this.o4_1 = probeDistance;
          return putIndex;
        }
        if (equals($this.k4_1[index - 1 | 0], key)) {
          return -index | 0;
        }
        probeDistance = probeDistance + 1 | 0;
        if (probeDistance > tentativeMaxProbeDistance) {
          rehash($this, imul(_get_hashSize__tftcho($this), 2));
          continue retry;
        }
        var _unary__edvuaz_0 = hash_0;
        hash_0 = _unary__edvuaz_0 - 1 | 0;
        if (_unary__edvuaz_0 === 0)
          hash_0 = _get_hashSize__tftcho($this) - 1 | 0;
      }
    }
  }
  function contentEquals($this, other) {
    return $this.s4_1 === other.g() && $this.d4(other.v());
  }
  function Companion_5() {
    this.z4_1 = -1640531527;
    this.a5_1 = 8;
    this.b5_1 = 2;
    this.c5_1 = -1;
  }
  var Companion_instance_5;
  function Companion_getInstance_5() {
    return Companion_instance_5;
  }
  function Itr(map) {
    this.d5_1 = map;
    this.e5_1 = 0;
    this.f5_1 = -1;
    this.g5_1 = this.d5_1.r4_1;
    this.h5();
  }
  protoOf(Itr).h5 = function () {
    while (this.e5_1 < this.d5_1.p4_1 && this.d5_1.m4_1[this.e5_1] < 0) {
      this.e5_1 = this.e5_1 + 1 | 0;
    }
  };
  protoOf(Itr).c = function () {
    return this.e5_1 < this.d5_1.p4_1;
  };
  protoOf(Itr).i5 = function () {
    if (!(this.d5_1.r4_1 === this.g5_1))
      throw ConcurrentModificationException_init_$Create$();
  };
  function KeysItr(map) {
    Itr.call(this, map);
  }
  protoOf(KeysItr).d = function () {
    this.i5();
    if (this.e5_1 >= this.d5_1.p4_1)
      throw NoSuchElementException_init_$Create$();
    var tmp = this;
    var _unary__edvuaz = this.e5_1;
    this.e5_1 = _unary__edvuaz + 1 | 0;
    tmp.f5_1 = _unary__edvuaz;
    var result = this.d5_1.k4_1[this.f5_1];
    this.h5();
    return result;
  };
  function ValuesItr(map) {
    Itr.call(this, map);
  }
  protoOf(ValuesItr).d = function () {
    this.i5();
    if (this.e5_1 >= this.d5_1.p4_1)
      throw NoSuchElementException_init_$Create$();
    var tmp = this;
    var _unary__edvuaz = this.e5_1;
    this.e5_1 = _unary__edvuaz + 1 | 0;
    tmp.f5_1 = _unary__edvuaz;
    var result = ensureNotNull(this.d5_1.l4_1)[this.f5_1];
    this.h5();
    return result;
  };
  function EntriesItr(map) {
    Itr.call(this, map);
  }
  protoOf(EntriesItr).d = function () {
    this.i5();
    if (this.e5_1 >= this.d5_1.p4_1)
      throw NoSuchElementException_init_$Create$();
    var tmp = this;
    var _unary__edvuaz = this.e5_1;
    this.e5_1 = _unary__edvuaz + 1 | 0;
    tmp.f5_1 = _unary__edvuaz;
    var result = new EntryRef(this.d5_1, this.f5_1);
    this.h5();
    return result;
  };
  protoOf(EntriesItr).v5 = function () {
    if (this.e5_1 >= this.d5_1.p4_1)
      throw NoSuchElementException_init_$Create$();
    var tmp = this;
    var _unary__edvuaz = this.e5_1;
    this.e5_1 = _unary__edvuaz + 1 | 0;
    tmp.f5_1 = _unary__edvuaz;
    // Inline function 'kotlin.hashCode' call
    var tmp0_safe_receiver = this.d5_1.k4_1[this.f5_1];
    var tmp1_elvis_lhs = tmp0_safe_receiver == null ? null : hashCode(tmp0_safe_receiver);
    var tmp_0 = tmp1_elvis_lhs == null ? 0 : tmp1_elvis_lhs;
    // Inline function 'kotlin.hashCode' call
    var tmp0_safe_receiver_0 = ensureNotNull(this.d5_1.l4_1)[this.f5_1];
    var tmp1_elvis_lhs_0 = tmp0_safe_receiver_0 == null ? null : hashCode(tmp0_safe_receiver_0);
    var result = tmp_0 ^ (tmp1_elvis_lhs_0 == null ? 0 : tmp1_elvis_lhs_0);
    this.h5();
    return result;
  };
  protoOf(EntriesItr).w5 = function (sb) {
    if (this.e5_1 >= this.d5_1.p4_1)
      throw NoSuchElementException_init_$Create$();
    var tmp = this;
    var _unary__edvuaz = this.e5_1;
    this.e5_1 = _unary__edvuaz + 1 | 0;
    tmp.f5_1 = _unary__edvuaz;
    var key = this.d5_1.k4_1[this.f5_1];
    if (equals(key, this.d5_1))
      sb.z5('(this Map)');
    else
      sb.y5(key);
    sb.a6(_Char___init__impl__6a9atx(61));
    var value = ensureNotNull(this.d5_1.l4_1)[this.f5_1];
    if (equals(value, this.d5_1))
      sb.z5('(this Map)');
    else
      sb.y5(value);
    this.h5();
  };
  function EntryRef(map, index) {
    this.u4_1 = map;
    this.v4_1 = index;
    this.w4_1 = this.u4_1.r4_1;
  }
  protoOf(EntryRef).o = function () {
    checkForComodification(this);
    return this.u4_1.k4_1[this.v4_1];
  };
  protoOf(EntryRef).p = function () {
    checkForComodification(this);
    return ensureNotNull(this.u4_1.l4_1)[this.v4_1];
  };
  protoOf(EntryRef).equals = function (other) {
    var tmp;
    var tmp_0;
    if (!(other == null) ? isInterface(other, Entry) : false) {
      tmp_0 = equals(other.o(), this.o());
    } else {
      tmp_0 = false;
    }
    if (tmp_0) {
      tmp = equals(other.p(), this.p());
    } else {
      tmp = false;
    }
    return tmp;
  };
  protoOf(EntryRef).hashCode = function () {
    // Inline function 'kotlin.hashCode' call
    var tmp0_safe_receiver = this.o();
    var tmp1_elvis_lhs = tmp0_safe_receiver == null ? null : hashCode(tmp0_safe_receiver);
    var tmp = tmp1_elvis_lhs == null ? 0 : tmp1_elvis_lhs;
    // Inline function 'kotlin.hashCode' call
    var tmp0_safe_receiver_0 = this.p();
    var tmp1_elvis_lhs_0 = tmp0_safe_receiver_0 == null ? null : hashCode(tmp0_safe_receiver_0);
    return tmp ^ (tmp1_elvis_lhs_0 == null ? 0 : tmp1_elvis_lhs_0);
  };
  protoOf(EntryRef).toString = function () {
    return toString_0(this.o()) + '=' + toString_0(this.p());
  };
  function InternalHashMap(keysArray, valuesArray, presenceArray, hashArray, maxProbeDistance, length) {
    this.k4_1 = keysArray;
    this.l4_1 = valuesArray;
    this.m4_1 = presenceArray;
    this.n4_1 = hashArray;
    this.o4_1 = maxProbeDistance;
    this.p4_1 = length;
    this.q4_1 = computeShift(Companion_instance_5, _get_hashSize__tftcho(this));
    this.r4_1 = 0;
    this.s4_1 = 0;
    this.t4_1 = false;
  }
  protoOf(InternalHashMap).g = function () {
    return this.s4_1;
  };
  protoOf(InternalHashMap).b6 = function () {
    this.y4();
    this.t4_1 = true;
  };
  protoOf(InternalHashMap).r = function (value) {
    return findValue(this, value) >= 0;
  };
  protoOf(InternalHashMap).s = function (key) {
    var index = findKey(this, key);
    if (index < 0)
      return null;
    return ensureNotNull(this.l4_1)[index];
  };
  protoOf(InternalHashMap).r3 = function (key) {
    return findKey(this, key) >= 0;
  };
  protoOf(InternalHashMap).b2 = function (key, value) {
    var index = addKey(this, key);
    var valuesArray = allocateValuesArray(this);
    if (index < 0) {
      var oldValue = valuesArray[(-index | 0) - 1 | 0];
      valuesArray[(-index | 0) - 1 | 0] = value;
      return oldValue;
    } else {
      valuesArray[index] = value;
      return null;
    }
  };
  protoOf(InternalHashMap).equals = function (other) {
    var tmp;
    if (other === this) {
      tmp = true;
    } else {
      var tmp_0;
      if (!(other == null) ? isInterface(other, KtMap) : false) {
        tmp_0 = contentEquals(this, other);
      } else {
        tmp_0 = false;
      }
      tmp = tmp_0;
    }
    return tmp;
  };
  protoOf(InternalHashMap).hashCode = function () {
    var result = 0;
    var it = this.z3();
    while (it.c()) {
      result = result + it.v5() | 0;
    }
    return result;
  };
  protoOf(InternalHashMap).toString = function () {
    var sb = StringBuilder_init_$Create$(2 + imul(this.s4_1, 3) | 0);
    sb.z5('{');
    var i = 0;
    var it = this.z3();
    while (it.c()) {
      if (i > 0) {
        sb.z5(', ');
      }
      it.w5(sb);
      i = i + 1 | 0;
    }
    sb.z5('}');
    return sb.toString();
  };
  protoOf(InternalHashMap).y4 = function () {
    if (this.t4_1)
      throw UnsupportedOperationException_init_$Create$();
  };
  protoOf(InternalHashMap).c4 = function (entry) {
    var index = findKey(this, entry.o());
    if (index < 0)
      return false;
    return equals(ensureNotNull(this.l4_1)[index], entry.p());
  };
  protoOf(InternalHashMap).c6 = function (entry) {
    return this.c4(isInterface(entry, Entry) ? entry : THROW_CCE());
  };
  protoOf(InternalHashMap).t3 = function () {
    return new KeysItr(this);
  };
  protoOf(InternalHashMap).w3 = function () {
    return new ValuesItr(this);
  };
  protoOf(InternalHashMap).z3 = function () {
    return new EntriesItr(this);
  };
  function InternalMap() {
  }
  function LinkedHashMap_init_$Init$($this) {
    HashMap_init_$Init$_0($this);
    LinkedHashMap.call($this);
    return $this;
  }
  function LinkedHashMap_init_$Create$() {
    return LinkedHashMap_init_$Init$(objectCreate(protoOf(LinkedHashMap)));
  }
  function LinkedHashMap_init_$Init$_0(initialCapacity, $this) {
    HashMap_init_$Init$_2(initialCapacity, $this);
    LinkedHashMap.call($this);
    return $this;
  }
  function LinkedHashMap_init_$Create$_0(initialCapacity) {
    return LinkedHashMap_init_$Init$_0(initialCapacity, objectCreate(protoOf(LinkedHashMap)));
  }
  function LinkedHashMap_init_$Init$_1(internalMap, $this) {
    HashMap_init_$Init$(internalMap, $this);
    LinkedHashMap.call($this);
    return $this;
  }
  function LinkedHashMap_init_$Create$_1(internalMap) {
    return LinkedHashMap_init_$Init$_1(internalMap, objectCreate(protoOf(LinkedHashMap)));
  }
  function EmptyHolder() {
    EmptyHolder_instance = this;
    var tmp = this;
    // Inline function 'kotlin.also' call
    var this_0 = InternalHashMap_init_$Create$_0(0);
    this_0.b6();
    tmp.d6_1 = LinkedHashMap_init_$Create$_1(this_0);
  }
  var EmptyHolder_instance;
  function EmptyHolder_getInstance() {
    if (EmptyHolder_instance == null)
      new EmptyHolder();
    return EmptyHolder_instance;
  }
  protoOf(LinkedHashMap).s1 = function () {
    this.p3_1.b6();
    var tmp;
    if (this.g() > 0) {
      tmp = this;
    } else {
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      tmp = EmptyHolder_getInstance().d6_1;
    }
    return tmp;
  };
  function LinkedHashMap() {
  }
  function LinkedHashSet_init_$Init$($this) {
    HashSet_init_$Init$_0($this);
    LinkedHashSet.call($this);
    return $this;
  }
  function LinkedHashSet_init_$Create$() {
    return LinkedHashSet_init_$Init$(objectCreate(protoOf(LinkedHashSet)));
  }
  function LinkedHashSet_init_$Init$_0(internalMap, $this) {
    HashSet_init_$Init$(internalMap, $this);
    LinkedHashSet.call($this);
    return $this;
  }
  function LinkedHashSet_init_$Create$_0(internalMap) {
    return LinkedHashSet_init_$Init$_0(internalMap, objectCreate(protoOf(LinkedHashSet)));
  }
  function EmptyHolder_0() {
    EmptyHolder_instance_0 = this;
    var tmp = this;
    // Inline function 'kotlin.also' call
    var this_0 = InternalHashMap_init_$Create$_0(0);
    this_0.b6();
    tmp.e6_1 = LinkedHashSet_init_$Create$_0(this_0);
  }
  var EmptyHolder_instance_0;
  function EmptyHolder_getInstance_0() {
    if (EmptyHolder_instance_0 == null)
      new EmptyHolder_0();
    return EmptyHolder_instance_0;
  }
  protoOf(LinkedHashSet).s1 = function () {
    this.j4_1.b6();
    return this.g() > 0 ? this : EmptyHolder_getInstance_0().e6_1;
  };
  function LinkedHashSet() {
  }
  function Exception_init_$Init$($this) {
    extendThrowable($this);
    Exception.call($this);
    return $this;
  }
  function Exception_init_$Create$() {
    var tmp = Exception_init_$Init$(objectCreate(protoOf(Exception)));
    captureStack(tmp, Exception_init_$Create$);
    return tmp;
  }
  function Exception_init_$Init$_0(message, $this) {
    extendThrowable($this, message);
    Exception.call($this);
    return $this;
  }
  function Exception_init_$Create$_0(message) {
    var tmp = Exception_init_$Init$_0(message, objectCreate(protoOf(Exception)));
    captureStack(tmp, Exception_init_$Create$_0);
    return tmp;
  }
  function Exception() {
    captureStack(this, Exception);
  }
  function IllegalArgumentException_init_$Init$($this) {
    RuntimeException_init_$Init$($this);
    IllegalArgumentException.call($this);
    return $this;
  }
  function IllegalArgumentException_init_$Create$() {
    var tmp = IllegalArgumentException_init_$Init$(objectCreate(protoOf(IllegalArgumentException)));
    captureStack(tmp, IllegalArgumentException_init_$Create$);
    return tmp;
  }
  function IllegalArgumentException_init_$Init$_0(message, $this) {
    RuntimeException_init_$Init$_0(message, $this);
    IllegalArgumentException.call($this);
    return $this;
  }
  function IllegalArgumentException_init_$Create$_0(message) {
    var tmp = IllegalArgumentException_init_$Init$_0(message, objectCreate(protoOf(IllegalArgumentException)));
    captureStack(tmp, IllegalArgumentException_init_$Create$_0);
    return tmp;
  }
  function IllegalArgumentException() {
    captureStack(this, IllegalArgumentException);
  }
  function IllegalStateException_init_$Init$($this) {
    RuntimeException_init_$Init$($this);
    IllegalStateException.call($this);
    return $this;
  }
  function IllegalStateException_init_$Create$() {
    var tmp = IllegalStateException_init_$Init$(objectCreate(protoOf(IllegalStateException)));
    captureStack(tmp, IllegalStateException_init_$Create$);
    return tmp;
  }
  function IllegalStateException_init_$Init$_0(message, $this) {
    RuntimeException_init_$Init$_0(message, $this);
    IllegalStateException.call($this);
    return $this;
  }
  function IllegalStateException_init_$Create$_0(message) {
    var tmp = IllegalStateException_init_$Init$_0(message, objectCreate(protoOf(IllegalStateException)));
    captureStack(tmp, IllegalStateException_init_$Create$_0);
    return tmp;
  }
  function IllegalStateException() {
    captureStack(this, IllegalStateException);
  }
  function UnsupportedOperationException_init_$Init$($this) {
    RuntimeException_init_$Init$($this);
    UnsupportedOperationException.call($this);
    return $this;
  }
  function UnsupportedOperationException_init_$Create$() {
    var tmp = UnsupportedOperationException_init_$Init$(objectCreate(protoOf(UnsupportedOperationException)));
    captureStack(tmp, UnsupportedOperationException_init_$Create$);
    return tmp;
  }
  function UnsupportedOperationException_init_$Init$_0(message, $this) {
    RuntimeException_init_$Init$_0(message, $this);
    UnsupportedOperationException.call($this);
    return $this;
  }
  function UnsupportedOperationException_init_$Create$_0(message) {
    var tmp = UnsupportedOperationException_init_$Init$_0(message, objectCreate(protoOf(UnsupportedOperationException)));
    captureStack(tmp, UnsupportedOperationException_init_$Create$_0);
    return tmp;
  }
  function UnsupportedOperationException() {
    captureStack(this, UnsupportedOperationException);
  }
  function RuntimeException_init_$Init$($this) {
    Exception_init_$Init$($this);
    RuntimeException.call($this);
    return $this;
  }
  function RuntimeException_init_$Create$() {
    var tmp = RuntimeException_init_$Init$(objectCreate(protoOf(RuntimeException)));
    captureStack(tmp, RuntimeException_init_$Create$);
    return tmp;
  }
  function RuntimeException_init_$Init$_0(message, $this) {
    Exception_init_$Init$_0(message, $this);
    RuntimeException.call($this);
    return $this;
  }
  function RuntimeException_init_$Create$_0(message) {
    var tmp = RuntimeException_init_$Init$_0(message, objectCreate(protoOf(RuntimeException)));
    captureStack(tmp, RuntimeException_init_$Create$_0);
    return tmp;
  }
  function RuntimeException() {
    captureStack(this, RuntimeException);
  }
  function NoSuchElementException_init_$Init$($this) {
    RuntimeException_init_$Init$($this);
    NoSuchElementException.call($this);
    return $this;
  }
  function NoSuchElementException_init_$Create$() {
    var tmp = NoSuchElementException_init_$Init$(objectCreate(protoOf(NoSuchElementException)));
    captureStack(tmp, NoSuchElementException_init_$Create$);
    return tmp;
  }
  function NoSuchElementException_init_$Init$_0(message, $this) {
    RuntimeException_init_$Init$_0(message, $this);
    NoSuchElementException.call($this);
    return $this;
  }
  function NoSuchElementException_init_$Create$_0(message) {
    var tmp = NoSuchElementException_init_$Init$_0(message, objectCreate(protoOf(NoSuchElementException)));
    captureStack(tmp, NoSuchElementException_init_$Create$_0);
    return tmp;
  }
  function NoSuchElementException() {
    captureStack(this, NoSuchElementException);
  }
  function IndexOutOfBoundsException_init_$Init$($this) {
    RuntimeException_init_$Init$($this);
    IndexOutOfBoundsException.call($this);
    return $this;
  }
  function IndexOutOfBoundsException_init_$Create$() {
    var tmp = IndexOutOfBoundsException_init_$Init$(objectCreate(protoOf(IndexOutOfBoundsException)));
    captureStack(tmp, IndexOutOfBoundsException_init_$Create$);
    return tmp;
  }
  function IndexOutOfBoundsException_init_$Init$_0(message, $this) {
    RuntimeException_init_$Init$_0(message, $this);
    IndexOutOfBoundsException.call($this);
    return $this;
  }
  function IndexOutOfBoundsException_init_$Create$_0(message) {
    var tmp = IndexOutOfBoundsException_init_$Init$_0(message, objectCreate(protoOf(IndexOutOfBoundsException)));
    captureStack(tmp, IndexOutOfBoundsException_init_$Create$_0);
    return tmp;
  }
  function IndexOutOfBoundsException() {
    captureStack(this, IndexOutOfBoundsException);
  }
  function ConcurrentModificationException_init_$Init$($this) {
    RuntimeException_init_$Init$($this);
    ConcurrentModificationException.call($this);
    return $this;
  }
  function ConcurrentModificationException_init_$Create$() {
    var tmp = ConcurrentModificationException_init_$Init$(objectCreate(protoOf(ConcurrentModificationException)));
    captureStack(tmp, ConcurrentModificationException_init_$Create$);
    return tmp;
  }
  function ConcurrentModificationException_init_$Init$_0(message, $this) {
    RuntimeException_init_$Init$_0(message, $this);
    ConcurrentModificationException.call($this);
    return $this;
  }
  function ConcurrentModificationException_init_$Create$_0(message) {
    var tmp = ConcurrentModificationException_init_$Init$_0(message, objectCreate(protoOf(ConcurrentModificationException)));
    captureStack(tmp, ConcurrentModificationException_init_$Create$_0);
    return tmp;
  }
  function ConcurrentModificationException() {
    captureStack(this, ConcurrentModificationException);
  }
  function NullPointerException_init_$Init$($this) {
    RuntimeException_init_$Init$($this);
    NullPointerException.call($this);
    return $this;
  }
  function NullPointerException_init_$Create$() {
    var tmp = NullPointerException_init_$Init$(objectCreate(protoOf(NullPointerException)));
    captureStack(tmp, NullPointerException_init_$Create$);
    return tmp;
  }
  function NullPointerException() {
    captureStack(this, NullPointerException);
  }
  function ClassCastException_init_$Init$($this) {
    RuntimeException_init_$Init$($this);
    ClassCastException.call($this);
    return $this;
  }
  function ClassCastException_init_$Create$() {
    var tmp = ClassCastException_init_$Init$(objectCreate(protoOf(ClassCastException)));
    captureStack(tmp, ClassCastException_init_$Create$);
    return tmp;
  }
  function ClassCastException() {
    captureStack(this, ClassCastException);
  }
  function fillFrom(src, dst) {
    var srcLen = src.length;
    var dstLen = dst.length;
    var index = 0;
    // Inline function 'kotlin.js.unsafeCast' call
    var arr = dst;
    while (index < srcLen && index < dstLen) {
      var tmp = index;
      var _unary__edvuaz = index;
      index = _unary__edvuaz + 1 | 0;
      arr[tmp] = src[_unary__edvuaz];
    }
    return dst;
  }
  function arrayCopyResize(source, newSize, defaultValue) {
    // Inline function 'kotlin.js.unsafeCast' call
    var result = source.slice(0, newSize);
    // Inline function 'kotlin.copyArrayType' call
    if (source.$type$ !== undefined) {
      result.$type$ = source.$type$;
    }
    var index = source.length;
    if (newSize > index) {
      // Inline function 'kotlin.js.asDynamic' call
      result.length = newSize;
      while (index < newSize) {
        var _unary__edvuaz = index;
        index = _unary__edvuaz + 1 | 0;
        result[_unary__edvuaz] = defaultValue;
      }
    }
    return result;
  }
  function StringBuilder_init_$Init$(capacity, $this) {
    StringBuilder_init_$Init$_0($this);
    return $this;
  }
  function StringBuilder_init_$Create$(capacity) {
    return StringBuilder_init_$Init$(capacity, objectCreate(protoOf(StringBuilder)));
  }
  function StringBuilder_init_$Init$_0($this) {
    StringBuilder.call($this, '');
    return $this;
  }
  function StringBuilder_init_$Create$_0() {
    return StringBuilder_init_$Init$_0(objectCreate(protoOf(StringBuilder)));
  }
  function StringBuilder(content) {
    this.x5_1 = content;
  }
  protoOf(StringBuilder).a6 = function (value) {
    this.x5_1 = this.x5_1 + toString(value);
    return this;
  };
  protoOf(StringBuilder).a = function (value) {
    this.x5_1 = this.x5_1 + toString_0(value);
    return this;
  };
  protoOf(StringBuilder).y5 = function (value) {
    this.x5_1 = this.x5_1 + toString_0(value);
    return this;
  };
  protoOf(StringBuilder).z5 = function (value) {
    var tmp = this;
    var tmp_0 = this.x5_1;
    tmp.x5_1 = tmp_0 + (value == null ? 'null' : value);
    return this;
  };
  protoOf(StringBuilder).toString = function () {
    return this.x5_1;
  };
  function AbstractCollection$toString$lambda(this$0) {
    return function (it) {
      return it === this$0 ? '(this Collection)' : toString_0(it);
    };
  }
  function AbstractCollection() {
  }
  protoOf(AbstractCollection).h = function (element) {
    var tmp$ret$0;
    $l$block_0: {
      // Inline function 'kotlin.collections.any' call
      var tmp;
      if (isInterface(this, Collection)) {
        tmp = this.e();
      } else {
        tmp = false;
      }
      if (tmp) {
        tmp$ret$0 = false;
        break $l$block_0;
      }
      var _iterator__ex2g4s = this.b();
      while (_iterator__ex2g4s.c()) {
        var element_0 = _iterator__ex2g4s.d();
        if (equals(element_0, element)) {
          tmp$ret$0 = true;
          break $l$block_0;
        }
      }
      tmp$ret$0 = false;
    }
    return tmp$ret$0;
  };
  protoOf(AbstractCollection).i = function (elements) {
    var tmp$ret$0;
    $l$block_0: {
      // Inline function 'kotlin.collections.all' call
      var tmp;
      if (isInterface(elements, Collection)) {
        tmp = elements.e();
      } else {
        tmp = false;
      }
      if (tmp) {
        tmp$ret$0 = true;
        break $l$block_0;
      }
      var _iterator__ex2g4s = elements.b();
      while (_iterator__ex2g4s.c()) {
        var element = _iterator__ex2g4s.d();
        if (!this.h(element)) {
          tmp$ret$0 = false;
          break $l$block_0;
        }
      }
      tmp$ret$0 = true;
    }
    return tmp$ret$0;
  };
  protoOf(AbstractCollection).e = function () {
    return this.g() === 0;
  };
  protoOf(AbstractCollection).toString = function () {
    return joinToString_0(this, ', ', '[', ']', VOID, VOID, AbstractCollection$toString$lambda(this));
  };
  protoOf(AbstractCollection).toArray = function () {
    return collectionToArray(this);
  };
  function SubList_0(list, fromIndex, toIndex) {
    AbstractList.call(this);
    this.h6_1 = list;
    this.i6_1 = fromIndex;
    this.j6_1 = 0;
    Companion_instance_6.s2(this.i6_1, toIndex, this.h6_1.g());
    this.j6_1 = toIndex - this.i6_1 | 0;
  }
  protoOf(SubList_0).f = function (index) {
    Companion_instance_6.t2(index, this.j6_1);
    return this.h6_1.f(this.i6_1 + index | 0);
  };
  protoOf(SubList_0).g = function () {
    return this.j6_1;
  };
  protoOf(SubList_0).n = function (fromIndex, toIndex) {
    Companion_instance_6.s2(fromIndex, toIndex, this.j6_1);
    return new SubList_0(this.h6_1, this.i6_1 + fromIndex | 0, this.i6_1 + toIndex | 0);
  };
  function IteratorImpl_0($outer) {
    this.l6_1 = $outer;
    this.k6_1 = 0;
  }
  protoOf(IteratorImpl_0).c = function () {
    return this.k6_1 < this.l6_1.g();
  };
  protoOf(IteratorImpl_0).d = function () {
    if (!this.c())
      throw NoSuchElementException_init_$Create$();
    var _unary__edvuaz = this.k6_1;
    this.k6_1 = _unary__edvuaz + 1 | 0;
    return this.l6_1.f(_unary__edvuaz);
  };
  function ListIteratorImpl_0($outer, index) {
    this.o6_1 = $outer;
    IteratorImpl_0.call(this, $outer);
    Companion_instance_6.k2(index, this.o6_1.g());
    this.k6_1 = index;
  }
  protoOf(ListIteratorImpl_0).l2 = function () {
    return this.k6_1 > 0;
  };
  protoOf(ListIteratorImpl_0).m2 = function () {
    return this.k6_1;
  };
  protoOf(ListIteratorImpl_0).n2 = function () {
    if (!this.l2())
      throw NoSuchElementException_init_$Create$();
    this.k6_1 = this.k6_1 - 1 | 0;
    return this.o6_1.f(this.k6_1);
  };
  function Companion_6() {
    this.j2_1 = 2147483639;
  }
  protoOf(Companion_6).t2 = function (index, size) {
    if (index < 0 || index >= size) {
      throw IndexOutOfBoundsException_init_$Create$_0('index: ' + index + ', size: ' + size);
    }
  };
  protoOf(Companion_6).k2 = function (index, size) {
    if (index < 0 || index > size) {
      throw IndexOutOfBoundsException_init_$Create$_0('index: ' + index + ', size: ' + size);
    }
  };
  protoOf(Companion_6).s2 = function (fromIndex, toIndex, size) {
    if (fromIndex < 0 || toIndex > size) {
      throw IndexOutOfBoundsException_init_$Create$_0('fromIndex: ' + fromIndex + ', toIndex: ' + toIndex + ', size: ' + size);
    }
    if (fromIndex > toIndex) {
      throw IllegalArgumentException_init_$Create$_0('fromIndex: ' + fromIndex + ' > toIndex: ' + toIndex);
    }
  };
  protoOf(Companion_6).x4 = function (oldCapacity, minCapacity) {
    var newCapacity = oldCapacity + (oldCapacity >> 1) | 0;
    if ((newCapacity - minCapacity | 0) < 0)
      newCapacity = minCapacity;
    if ((newCapacity - 2147483639 | 0) > 0)
      newCapacity = minCapacity > 2147483639 ? 2147483647 : 2147483639;
    return newCapacity;
  };
  protoOf(Companion_6).w2 = function (c) {
    var hashCode_0 = 1;
    var _iterator__ex2g4s = c.b();
    while (_iterator__ex2g4s.c()) {
      var e = _iterator__ex2g4s.d();
      var tmp = imul(31, hashCode_0);
      var tmp1_elvis_lhs = e == null ? null : hashCode(e);
      hashCode_0 = tmp + (tmp1_elvis_lhs == null ? 0 : tmp1_elvis_lhs) | 0;
    }
    return hashCode_0;
  };
  protoOf(Companion_6).v2 = function (c, other) {
    if (!(c.g() === other.g()))
      return false;
    var otherIterator = other.b();
    var _iterator__ex2g4s = c.b();
    while (_iterator__ex2g4s.c()) {
      var elem = _iterator__ex2g4s.d();
      var elemOther = otherIterator.d();
      if (!equals(elem, elemOther)) {
        return false;
      }
    }
    return true;
  };
  var Companion_instance_6;
  function Companion_getInstance_6() {
    return Companion_instance_6;
  }
  function AbstractList() {
    AbstractCollection.call(this);
  }
  protoOf(AbstractList).b = function () {
    return new IteratorImpl_0(this);
  };
  protoOf(AbstractList).j = function (element) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.indexOfFirst' call
      var index = 0;
      var _iterator__ex2g4s = this.b();
      while (_iterator__ex2g4s.c()) {
        var item = _iterator__ex2g4s.d();
        if (equals(item, element)) {
          tmp$ret$1 = index;
          break $l$block;
        }
        index = index + 1 | 0;
      }
      tmp$ret$1 = -1;
    }
    return tmp$ret$1;
  };
  protoOf(AbstractList).k = function (element) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.indexOfLast' call
      var iterator = this.m(this.g());
      while (iterator.l2()) {
        var it = iterator.n2();
        if (equals(it, element)) {
          tmp$ret$1 = iterator.m2();
          break $l$block;
        }
      }
      tmp$ret$1 = -1;
    }
    return tmp$ret$1;
  };
  protoOf(AbstractList).l = function () {
    return new ListIteratorImpl_0(this, 0);
  };
  protoOf(AbstractList).m = function (index) {
    return new ListIteratorImpl_0(this, index);
  };
  protoOf(AbstractList).n = function (fromIndex, toIndex) {
    return new SubList_0(this, fromIndex, toIndex);
  };
  protoOf(AbstractList).equals = function (other) {
    if (other === this)
      return true;
    if (!(!(other == null) ? isInterface(other, KtList) : false))
      return false;
    return Companion_instance_6.v2(this, other);
  };
  protoOf(AbstractList).hashCode = function () {
    return Companion_instance_6.w2(this);
  };
  function AbstractMap$keys$1$iterator$1($entryIterator) {
    this.p6_1 = $entryIterator;
  }
  protoOf(AbstractMap$keys$1$iterator$1).c = function () {
    return this.p6_1.c();
  };
  protoOf(AbstractMap$keys$1$iterator$1).d = function () {
    return this.p6_1.d().o();
  };
  function AbstractMap$values$1$iterator$1($entryIterator) {
    this.q6_1 = $entryIterator;
  }
  protoOf(AbstractMap$values$1$iterator$1).c = function () {
    return this.q6_1.c();
  };
  protoOf(AbstractMap$values$1$iterator$1).d = function () {
    return this.q6_1.d().p();
  };
  function toString_2($this, entry) {
    return toString_3($this, entry.o()) + '=' + toString_3($this, entry.p());
  }
  function toString_3($this, o) {
    return o === $this ? '(this Map)' : toString_0(o);
  }
  function implFindEntry($this, key) {
    var tmp0 = $this.v();
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.collections.firstOrNull' call
      var _iterator__ex2g4s = tmp0.b();
      while (_iterator__ex2g4s.c()) {
        var element = _iterator__ex2g4s.d();
        if (equals(element.o(), key)) {
          tmp$ret$1 = element;
          break $l$block;
        }
      }
      tmp$ret$1 = null;
    }
    return tmp$ret$1;
  }
  function Companion_7() {
  }
  var Companion_instance_7;
  function Companion_getInstance_7() {
    return Companion_instance_7;
  }
  function AbstractMap$keys$1(this$0) {
    this.r6_1 = this$0;
    AbstractSet.call(this);
  }
  protoOf(AbstractMap$keys$1).r3 = function (element) {
    return this.r6_1.q(element);
  };
  protoOf(AbstractMap$keys$1).h = function (element) {
    if (!(element == null ? true : !(element == null)))
      return false;
    return this.r3((element == null ? true : !(element == null)) ? element : THROW_CCE());
  };
  protoOf(AbstractMap$keys$1).b = function () {
    var entryIterator = this.r6_1.v().b();
    return new AbstractMap$keys$1$iterator$1(entryIterator);
  };
  protoOf(AbstractMap$keys$1).g = function () {
    return this.r6_1.g();
  };
  function AbstractMap$toString$lambda(this$0) {
    return function (it) {
      return toString_2(this$0, it);
    };
  }
  function AbstractMap$values$1(this$0) {
    this.s6_1 = this$0;
    AbstractCollection.call(this);
  }
  protoOf(AbstractMap$values$1).v3 = function (element) {
    return this.s6_1.r(element);
  };
  protoOf(AbstractMap$values$1).h = function (element) {
    if (!(element == null ? true : !(element == null)))
      return false;
    return this.v3((element == null ? true : !(element == null)) ? element : THROW_CCE());
  };
  protoOf(AbstractMap$values$1).b = function () {
    var entryIterator = this.s6_1.v().b();
    return new AbstractMap$values$1$iterator$1(entryIterator);
  };
  protoOf(AbstractMap$values$1).g = function () {
    return this.s6_1.g();
  };
  function AbstractMap() {
    this.d3_1 = null;
    this.e3_1 = null;
  }
  protoOf(AbstractMap).q = function (key) {
    return !(implFindEntry(this, key) == null);
  };
  protoOf(AbstractMap).r = function (value) {
    var tmp0 = this.v();
    var tmp$ret$0;
    $l$block_0: {
      // Inline function 'kotlin.collections.any' call
      var tmp;
      if (isInterface(tmp0, Collection)) {
        tmp = tmp0.e();
      } else {
        tmp = false;
      }
      if (tmp) {
        tmp$ret$0 = false;
        break $l$block_0;
      }
      var _iterator__ex2g4s = tmp0.b();
      while (_iterator__ex2g4s.c()) {
        var element = _iterator__ex2g4s.d();
        if (equals(element.p(), value)) {
          tmp$ret$0 = true;
          break $l$block_0;
        }
      }
      tmp$ret$0 = false;
    }
    return tmp$ret$0;
  };
  protoOf(AbstractMap).f3 = function (entry) {
    if (!(!(entry == null) ? isInterface(entry, Entry) : false))
      return false;
    var key = entry.o();
    var value = entry.p();
    // Inline function 'kotlin.collections.get' call
    var ourValue = (isInterface(this, KtMap) ? this : THROW_CCE()).s(key);
    if (!equals(value, ourValue)) {
      return false;
    }
    var tmp;
    if (ourValue == null) {
      // Inline function 'kotlin.collections.containsKey' call
      tmp = !(isInterface(this, KtMap) ? this : THROW_CCE()).q(key);
    } else {
      tmp = false;
    }
    if (tmp) {
      return false;
    }
    return true;
  };
  protoOf(AbstractMap).equals = function (other) {
    if (other === this)
      return true;
    if (!(!(other == null) ? isInterface(other, KtMap) : false))
      return false;
    if (!(this.g() === other.g()))
      return false;
    var tmp0 = other.v();
    var tmp$ret$0;
    $l$block_0: {
      // Inline function 'kotlin.collections.all' call
      var tmp;
      if (isInterface(tmp0, Collection)) {
        tmp = tmp0.e();
      } else {
        tmp = false;
      }
      if (tmp) {
        tmp$ret$0 = true;
        break $l$block_0;
      }
      var _iterator__ex2g4s = tmp0.b();
      while (_iterator__ex2g4s.c()) {
        var element = _iterator__ex2g4s.d();
        if (!this.f3(element)) {
          tmp$ret$0 = false;
          break $l$block_0;
        }
      }
      tmp$ret$0 = true;
    }
    return tmp$ret$0;
  };
  protoOf(AbstractMap).s = function (key) {
    var tmp0_safe_receiver = implFindEntry(this, key);
    return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.p();
  };
  protoOf(AbstractMap).hashCode = function () {
    return hashCode(this.v());
  };
  protoOf(AbstractMap).e = function () {
    return this.g() === 0;
  };
  protoOf(AbstractMap).g = function () {
    return this.v().g();
  };
  protoOf(AbstractMap).t = function () {
    if (this.d3_1 == null) {
      var tmp = this;
      tmp.d3_1 = new AbstractMap$keys$1(this);
    }
    return ensureNotNull(this.d3_1);
  };
  protoOf(AbstractMap).toString = function () {
    var tmp = this.v();
    return joinToString_0(tmp, ', ', '{', '}', VOID, VOID, AbstractMap$toString$lambda(this));
  };
  protoOf(AbstractMap).u = function () {
    if (this.e3_1 == null) {
      var tmp = this;
      tmp.e3_1 = new AbstractMap$values$1(this);
    }
    return ensureNotNull(this.e3_1);
  };
  function Companion_8() {
  }
  protoOf(Companion_8).h3 = function (c) {
    var hashCode_0 = 0;
    var _iterator__ex2g4s = c.b();
    while (_iterator__ex2g4s.c()) {
      var element = _iterator__ex2g4s.d();
      var tmp = hashCode_0;
      var tmp1_elvis_lhs = element == null ? null : hashCode(element);
      hashCode_0 = tmp + (tmp1_elvis_lhs == null ? 0 : tmp1_elvis_lhs) | 0;
    }
    return hashCode_0;
  };
  protoOf(Companion_8).g3 = function (c, other) {
    if (!(c.g() === other.g()))
      return false;
    return c.i(other);
  };
  var Companion_instance_8;
  function Companion_getInstance_8() {
    return Companion_instance_8;
  }
  function AbstractSet() {
    AbstractCollection.call(this);
  }
  protoOf(AbstractSet).equals = function (other) {
    if (other === this)
      return true;
    if (!(!(other == null) ? isInterface(other, KtSet) : false))
      return false;
    return Companion_instance_8.g3(this, other);
  };
  protoOf(AbstractSet).hashCode = function () {
    return Companion_instance_8.h3(this);
  };
  function collectionToArrayCommonImpl(collection) {
    if (collection.e()) {
      // Inline function 'kotlin.emptyArray' call
      return [];
    }
    // Inline function 'kotlin.arrayOfNulls' call
    var size = collection.g();
    var destination = Array(size);
    var iterator = collection.b();
    var index = 0;
    while (iterator.c()) {
      var _unary__edvuaz = index;
      index = _unary__edvuaz + 1 | 0;
      destination[_unary__edvuaz] = iterator.d();
    }
    return destination;
  }
  function listOf(elements) {
    return elements.length > 0 ? asList(elements) : emptyList();
  }
  function emptyList() {
    return EmptyList_getInstance();
  }
  function get_lastIndex(_this__u8e3s4) {
    return _this__u8e3s4.g() - 1 | 0;
  }
  function EmptyList() {
    EmptyList_instance = this;
    this.t6_1 = new Long(-1478467534, -1720727600);
  }
  protoOf(EmptyList).equals = function (other) {
    var tmp;
    if (!(other == null) ? isInterface(other, KtList) : false) {
      tmp = other.e();
    } else {
      tmp = false;
    }
    return tmp;
  };
  protoOf(EmptyList).hashCode = function () {
    return 1;
  };
  protoOf(EmptyList).toString = function () {
    return '[]';
  };
  protoOf(EmptyList).g = function () {
    return 0;
  };
  protoOf(EmptyList).e = function () {
    return true;
  };
  protoOf(EmptyList).u6 = function (element) {
    return false;
  };
  protoOf(EmptyList).h = function (element) {
    if (!false)
      return false;
    var tmp;
    if (false) {
      tmp = element;
    } else {
      tmp = THROW_CCE();
    }
    return this.u6(tmp);
  };
  protoOf(EmptyList).v6 = function (elements) {
    return elements.e();
  };
  protoOf(EmptyList).i = function (elements) {
    return this.v6(elements);
  };
  protoOf(EmptyList).f = function (index) {
    throw IndexOutOfBoundsException_init_$Create$_0("Empty list doesn't contain element at index " + index + '.');
  };
  protoOf(EmptyList).w6 = function (element) {
    return -1;
  };
  protoOf(EmptyList).j = function (element) {
    if (!false)
      return -1;
    var tmp;
    if (false) {
      tmp = element;
    } else {
      tmp = THROW_CCE();
    }
    return this.w6(tmp);
  };
  protoOf(EmptyList).x6 = function (element) {
    return -1;
  };
  protoOf(EmptyList).k = function (element) {
    if (!false)
      return -1;
    var tmp;
    if (false) {
      tmp = element;
    } else {
      tmp = THROW_CCE();
    }
    return this.x6(tmp);
  };
  protoOf(EmptyList).b = function () {
    return EmptyIterator_instance;
  };
  protoOf(EmptyList).l = function () {
    return EmptyIterator_instance;
  };
  protoOf(EmptyList).m = function (index) {
    if (!(index === 0))
      throw IndexOutOfBoundsException_init_$Create$_0('Index: ' + index);
    return EmptyIterator_instance;
  };
  protoOf(EmptyList).n = function (fromIndex, toIndex) {
    if (fromIndex === 0 && toIndex === 0)
      return this;
    throw IndexOutOfBoundsException_init_$Create$_0('fromIndex: ' + fromIndex + ', toIndex: ' + toIndex);
  };
  var EmptyList_instance;
  function EmptyList_getInstance() {
    if (EmptyList_instance == null)
      new EmptyList();
    return EmptyList_instance;
  }
  function EmptyIterator() {
  }
  protoOf(EmptyIterator).c = function () {
    return false;
  };
  protoOf(EmptyIterator).l2 = function () {
    return false;
  };
  protoOf(EmptyIterator).m2 = function () {
    return 0;
  };
  protoOf(EmptyIterator).d = function () {
    throw NoSuchElementException_init_$Create$();
  };
  protoOf(EmptyIterator).n2 = function () {
    throw NoSuchElementException_init_$Create$();
  };
  var EmptyIterator_instance;
  function EmptyIterator_getInstance() {
    return EmptyIterator_instance;
  }
  function collectionSizeOrDefault(_this__u8e3s4, default_0) {
    var tmp;
    if (isInterface(_this__u8e3s4, Collection)) {
      tmp = _this__u8e3s4.g();
    } else {
      tmp = default_0;
    }
    return tmp;
  }
  function mapOf(pairs) {
    return pairs.length > 0 ? toMap(pairs, LinkedHashMap_init_$Create$_0(mapCapacity(pairs.length))) : emptyMap();
  }
  function toMap(_this__u8e3s4, destination) {
    // Inline function 'kotlin.apply' call
    putAll(destination, _this__u8e3s4);
    return destination;
  }
  function emptyMap() {
    var tmp = EmptyMap_getInstance();
    return isInterface(tmp, KtMap) ? tmp : THROW_CCE();
  }
  function putAll(_this__u8e3s4, pairs) {
    var inductionVariable = 0;
    var last = pairs.length;
    while (inductionVariable < last) {
      var _destruct__k2r9zo = pairs[inductionVariable];
      inductionVariable = inductionVariable + 1 | 0;
      var key = _destruct__k2r9zo.a7();
      var value = _destruct__k2r9zo.b7();
      _this__u8e3s4.b2(key, value);
    }
  }
  function EmptyMap() {
    EmptyMap_instance = this;
    this.c7_1 = new Long(-888910638, 1920087921);
  }
  protoOf(EmptyMap).equals = function (other) {
    var tmp;
    if (!(other == null) ? isInterface(other, KtMap) : false) {
      tmp = other.e();
    } else {
      tmp = false;
    }
    return tmp;
  };
  protoOf(EmptyMap).hashCode = function () {
    return 0;
  };
  protoOf(EmptyMap).toString = function () {
    return '{}';
  };
  protoOf(EmptyMap).g = function () {
    return 0;
  };
  protoOf(EmptyMap).e = function () {
    return true;
  };
  protoOf(EmptyMap).d7 = function (key) {
    return false;
  };
  protoOf(EmptyMap).q = function (key) {
    if (!(key == null ? true : !(key == null)))
      return false;
    return this.d7((key == null ? true : !(key == null)) ? key : THROW_CCE());
  };
  protoOf(EmptyMap).e7 = function (value) {
    return false;
  };
  protoOf(EmptyMap).r = function (value) {
    if (!false)
      return false;
    var tmp;
    if (false) {
      tmp = value;
    } else {
      tmp = THROW_CCE();
    }
    return this.e7(tmp);
  };
  protoOf(EmptyMap).f7 = function (key) {
    return null;
  };
  protoOf(EmptyMap).s = function (key) {
    if (!(key == null ? true : !(key == null)))
      return null;
    return this.f7((key == null ? true : !(key == null)) ? key : THROW_CCE());
  };
  protoOf(EmptyMap).v = function () {
    return EmptySet_getInstance();
  };
  protoOf(EmptyMap).t = function () {
    return EmptySet_getInstance();
  };
  protoOf(EmptyMap).u = function () {
    return EmptyList_getInstance();
  };
  var EmptyMap_instance;
  function EmptyMap_getInstance() {
    if (EmptyMap_instance == null)
      new EmptyMap();
    return EmptyMap_instance;
  }
  function emptySet() {
    return EmptySet_getInstance();
  }
  function EmptySet() {
    EmptySet_instance = this;
    this.g7_1 = new Long(1993859828, 793161749);
  }
  protoOf(EmptySet).equals = function (other) {
    var tmp;
    if (!(other == null) ? isInterface(other, KtSet) : false) {
      tmp = other.e();
    } else {
      tmp = false;
    }
    return tmp;
  };
  protoOf(EmptySet).hashCode = function () {
    return 0;
  };
  protoOf(EmptySet).toString = function () {
    return '[]';
  };
  protoOf(EmptySet).g = function () {
    return 0;
  };
  protoOf(EmptySet).e = function () {
    return true;
  };
  protoOf(EmptySet).u6 = function (element) {
    return false;
  };
  protoOf(EmptySet).h = function (element) {
    if (!false)
      return false;
    var tmp;
    if (false) {
      tmp = element;
    } else {
      tmp = THROW_CCE();
    }
    return this.u6(tmp);
  };
  protoOf(EmptySet).v6 = function (elements) {
    return elements.e();
  };
  protoOf(EmptySet).i = function (elements) {
    return this.v6(elements);
  };
  protoOf(EmptySet).b = function () {
    return EmptyIterator_instance;
  };
  var EmptySet_instance;
  function EmptySet_getInstance() {
    if (EmptySet_instance == null)
      new EmptySet();
    return EmptySet_instance;
  }
  function enumEntries(entries) {
    return new EnumEntriesList(entries);
  }
  function EnumEntriesList(entries) {
    AbstractList.call(this);
    this.h7_1 = entries;
  }
  protoOf(EnumEntriesList).g = function () {
    return this.h7_1.length;
  };
  protoOf(EnumEntriesList).f = function (index) {
    Companion_instance_6.t2(index, this.h7_1.length);
    return this.h7_1[index];
  };
  protoOf(EnumEntriesList).i7 = function (element) {
    if (element === null)
      return false;
    var target = getOrNull(this.h7_1, element.x_1);
    return target === element;
  };
  protoOf(EnumEntriesList).h = function (element) {
    if (!(element instanceof Enum))
      return false;
    return this.i7(element instanceof Enum ? element : THROW_CCE());
  };
  protoOf(EnumEntriesList).j7 = function (element) {
    if (element === null)
      return -1;
    var ordinal = element.x_1;
    var target = getOrNull(this.h7_1, ordinal);
    return target === element ? ordinal : -1;
  };
  protoOf(EnumEntriesList).j = function (element) {
    if (!(element instanceof Enum))
      return -1;
    return this.j7(element instanceof Enum ? element : THROW_CCE());
  };
  protoOf(EnumEntriesList).k7 = function (element) {
    return this.j7(element);
  };
  protoOf(EnumEntriesList).k = function (element) {
    if (!(element instanceof Enum))
      return -1;
    return this.k7(element instanceof Enum ? element : THROW_CCE());
  };
  function appendElement(_this__u8e3s4, element, transform) {
    if (!(transform == null))
      _this__u8e3s4.a(transform(element));
    else {
      if (element == null ? true : isCharSequence(element))
        _this__u8e3s4.a(element);
      else {
        if (element instanceof Char)
          _this__u8e3s4.a6(element.l7_1);
        else {
          _this__u8e3s4.a(toString_1(element));
        }
      }
    }
  }
  function Pair(first, second) {
    this.y6_1 = first;
    this.z6_1 = second;
  }
  protoOf(Pair).toString = function () {
    return '(' + toString_0(this.y6_1) + ', ' + toString_0(this.z6_1) + ')';
  };
  protoOf(Pair).a7 = function () {
    return this.y6_1;
  };
  protoOf(Pair).b7 = function () {
    return this.z6_1;
  };
  protoOf(Pair).hashCode = function () {
    var result = this.y6_1 == null ? 0 : hashCode(this.y6_1);
    result = imul(result, 31) + (this.z6_1 == null ? 0 : hashCode(this.z6_1)) | 0;
    return result;
  };
  protoOf(Pair).equals = function (other) {
    if (this === other)
      return true;
    if (!(other instanceof Pair))
      return false;
    var tmp0_other_with_cast = other instanceof Pair ? other : THROW_CCE();
    if (!equals(this.y6_1, tmp0_other_with_cast.y6_1))
      return false;
    if (!equals(this.z6_1, tmp0_other_with_cast.z6_1))
      return false;
    return true;
  };
  function to(_this__u8e3s4, that) {
    return new Pair(_this__u8e3s4, that);
  }
  //region block: post-declaration
  protoOf(AbstractMutableList).asJsReadonlyArrayView = asJsReadonlyArrayView;
  protoOf(AbstractMap).asJsReadonlyMapView = asJsReadonlyMapView;
  protoOf(AbstractMutableSet).asJsReadonlySetView = asJsReadonlySetView;
  protoOf(InternalHashMap).d4 = containsAllEntries;
  protoOf(AbstractList).asJsReadonlyArrayView = asJsReadonlyArrayView;
  protoOf(AbstractSet).asJsReadonlySetView = asJsReadonlySetView;
  protoOf(EmptyList).asJsReadonlyArrayView = asJsReadonlyArrayView;
  protoOf(EmptyMap).asJsReadonlyMapView = asJsReadonlyMapView;
  protoOf(EmptySet).asJsReadonlySetView = asJsReadonlySetView;
  //endregion
  //region block: init
  Companion_instance = new Companion();
  Companion_instance_0 = new Companion_0();
  Companion_instance_1 = new Companion_1();
  Companion_instance_2 = new Companion_2();
  Unit_instance = new Unit();
  Companion_instance_5 = new Companion_5();
  Companion_instance_6 = new Companion_6();
  Companion_instance_7 = new Companion_7();
  Companion_instance_8 = new Companion_8();
  EmptyIterator_instance = new EmptyIterator();
  //endregion
  //region block: exports
  function $jsExportAll$(_) {
    var $kotlin = _.kotlin || (_.kotlin = {});
    var $kotlin$collections = $kotlin.collections || ($kotlin.collections = {});
    defineProp($kotlin$collections, 'KtList', Companion_getInstance);
    defineProp($kotlin$collections, 'KtMap', Companion_getInstance_0);
    defineProp($kotlin$collections, 'KtSet', Companion_getInstance_1);
  }
  $jsExportAll$(_);
  _.$jsExportAll$ = $jsExportAll$;
  _.$_$ = _.$_$ || {};
  _.$_$.a = VOID;
  _.$_$.b = LinkedHashMap_init_$Create$_0;
  _.$_$.c = IllegalArgumentException_init_$Create$_0;
  _.$_$.d = IllegalStateException_init_$Create$_0;
  _.$_$.e = Unit_instance;
  _.$_$.f = collectionSizeOrDefault;
  _.$_$.g = emptyList;
  _.$_$.h = emptySet;
  _.$_$.i = last;
  _.$_$.j = listOf;
  _.$_$.k = mapCapacity;
  _.$_$.l = mapOf;
  _.$_$.m = enumEntries;
  _.$_$.n = defineProp;
  _.$_$.o = equals;
  _.$_$.p = getBooleanHashCode;
  _.$_$.q = getNumberHashCode;
  _.$_$.r = getStringHashCode;
  _.$_$.s = hashCode;
  _.$_$.t = initMetadataForClass;
  _.$_$.u = initMetadataForCompanion;
  _.$_$.v = isNumber;
  _.$_$.w = numberToDouble;
  _.$_$.x = numberToInt;
  _.$_$.y = protoOf;
  _.$_$.z = toString_1;
  _.$_$.a1 = coerceAtLeast_0;
  _.$_$.b1 = coerceAtLeast;
  _.$_$.c1 = coerceIn;
  _.$_$.d1 = coerceIn_0;
  _.$_$.e1 = Enum;
  _.$_$.f1 = THROW_CCE;
  _.$_$.g1 = THROW_IAE;
  _.$_$.h1 = ensureNotNull;
  _.$_$.i1 = isFinite;
  _.$_$.j1 = to;
  //endregion
  return _;
}));

//# sourceMappingURL=kotlin-kotlin-stdlib.js.map
