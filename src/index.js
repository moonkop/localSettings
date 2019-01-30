import { defaultSettings } from '../test/index.test'
function isObject(target) {
    return typeof target === 'object';
}
const TYPES = {
    Number: '[object Number]',
    String: '[object String]',
    Undefined: '[object Undefined]',
    Boolean: '[object Boolean]',
    Object: '[object Object]',
    Array: '[object Array]',
    Function: '[object Function]',
}
/**
 * 这个轮子主要是保存设置用的，核心在于es6的setter 监听赋值事件 并在赋值时直接更新缓存
 * 若要建立一个新的设置 请在defaultSettings对象里面建立一个新的字段 
 * 初始化以后所有设置都在 Settings对象内 用Settings.(你创造的字段) 如Settings.UserInfo
 * 取到的这个值 如果是对象 则这个对象也是受监听的 
 * ```
 * let info=Settings.UserInfo //or Settings.UserInfo.name='user1'
 * info.name='user1' //会被立刻持久化 更新到UserInfo对应的缓存中
 * ```
 * 对对象的监听是递归的 不管对象有多深 都会监听到对应的改动并持久化。
 * 如果取到的值不是对象 则无法进行监听 如
 * ```
 * let name=Settings.UserInfo.name;
 * name='user1'// 无法同步到缓存
 * ```
 * ---------------
 * 在赋值时 会对传入的值进行检查 如果和默认值的类型不同 则会抛出异常
 * ```
 * Settings.UserInfo.name={}//将抛出异常
 * ```
 * ----------------
 * 如果要取出对应的值对象（不受监听） 请使用 Settings.UserInfo._getValue()方法 
 * 不要对受到监听的对象使用JSON.stringfy 得不到预期的结果。
 * 
 * ----------------
 * 初始化与赋值时 以默认值为准，若默认值存在该字段 则与缓存中的进行类型比较，如果发现不匹配 则抛出异常
 * 
 * 存在的问题：数组没有set访问器 无法拦截对数组的操作 需要手动保存
 */
export function settingManagerInit() {
    let localStorage = window.localStorage;
    if (window.isTest) {
        localStorage = window.storage;
    }

    if (window.SettingManager) {
        window.SettingManager.init();
        return;
    } else {
        let SettingManager = {
            defaultProps: {
                prefix: 'Settings_' + window.userInfo.userNick + '_',
                suffix: ``,
            },
            getFullKey(key) {
                if (window.isTest) {
                    return key;
                } else {
                    return this.defaultProps.prefix + key + this.defaultProps.suffix;
                }
            },
            /**
             * 
             * 判断改动是否合法 
             * 将传入的默认值和改动的类型进行比较 若不同 则不合法（对数字与字符串有特殊的照顾）
             * 若传入的默认值不存在 如传入的改动是在新的字段上的改动 默认值没有这个字段 则改动合法 
             * @param {object} defaultVal 
             * @param {object} newVal
             * @return {undefined|string} 返回undefined说明合法 返回字符串说明不合法 字符串是不合法的原因
             */
            changeIsValid(defaultVal, newVal) {
                if (defaultVal == undefined) {
                    return ;
                }
                let getType = function (obj) {
                    return Object.prototype.toString.call(obj);
                }
                let isValid = function (correct, test) {
                    let correctType = getType(correct);
                    let testType = getType(test);
                    if (correctType === testType) {

                        if (correctType === TYPES.Object) {
                            let resArr = Object.keys(correct).map(key => {
                                let nextCorrect = correct[key];
                                let nextTest = test[key];
                                let valid=isValid(nextCorrect,nextTest)
                                if (valid != undefined){
                                    return '.'+key+"字段"+valid;
                                }else{
                                    return;
                                }
                            });
                            resArr = resArr.filter(item => item != undefined);
                            if (resArr.length == 0){
                                return;
                            }else{
                                return resArr.join(";");
                            }
                        }
                        return;
                    } else {
                        if (correctType == TYPES.String&&testType==TYPES.Number)
                        {
                            return;
                        }else if(correctType==TYPES.Number&&testType==TYPES.String)
                        {
                            if(isNaN(test*1)){
                                return "字符串无法转换为数字";
                            }else{
                                return;
                            }
                        }else{
                            if (testType == TYPES.Undefined){
                                return '不能为undefined'
                            }
                            return testType+"无法转换为"+correctType;
                        }
                    }
                }
                return isValid(defaultVal, newVal);
            },
            /**
             * 将缓存中的对象与默认对象进行【深度】递归合并 
             * ```
             * obj1={a:{b:'1'},d:10}
             * obj2={a:{c:2},e:20}
             * obj3=merge(obj1,obj2)
             * obj3=={
             *   a:{
             *      b:'1',
             *      c:2
             *   }
             *   d:10,
             *   e:20
             * }
             * ```
             * @param {object} obj  缓存中的对象
             * @param {object} defaultObj  默认的对象
             */
            merge(obj, defaultObj) {
                if (obj == undefined || obj == null) { //todo 判空
                    if (isObject(defaultObj)) {
                        return JSON.parse(JSON.stringify(defaultObj));
                    } else {
                        return defaultObj
                    }
                }
                if (isObject(defaultObj)) {
                    Object.keys(defaultObj).map(key => {
                        if (obj[key] == undefined) {
                            obj[key] = defaultObj[key];
                        }
                        else {
                            obj[key] = this.merge(obj[key], defaultObj[key]);
                        }
                    });
                }
                return obj;
            },
            /**
             * 将受监听的对象转换为不受监听的值对象 
             * @param {object} watchedObj 受监听的对象
             */
            convertWatchToValue(watchedObj) {
                if (!isObject(watchedObj)){
                    return watchedObj;
                }
                let valueObj = {};
                Object.keys(watchedObj._value).map(key => {
                    if (isObject(watchedObj._value[key])) {
                        valueObj[key] = this.convertWatchToValue(watchedObj._value[key]);
                    } else {
                        valueObj[key] = watchedObj._value[key];
                    }
                });
                return valueObj;
            },
            /**
             * 收到改动后 更新缓存中对应的项
             * @param {object} watchObj 受监听的对象
             * @param {string} storageKey 字段名
             */
            saveChangedValue(watchObj, storageKey) {
                localStorage.setItem(this.getFullKey(storageKey), JSON.stringify(this.convertWatchToValue(watchObj)));
            },
            /**
             * 把一个值对象变成一个受监视的对象
             * @param {object} valueObj 值对象
             * @param {object} defaultObj 与上面这个值对象对应的默认对象
             * @param {string} storageKey 字段名
             */
            convertValueToWatch(valueObj, defaultObj, storageKey) {
                let that = this;
                let watchObj = that._convertValueToWatch(valueObj, defaultObj,()=>{that.saveChangedValue(watchObj,storageKey)});
                return watchObj;
            },
            _convertValueToWatch (valueObj, defaultObj,changedCallback=()=>{}) {
                let that = this;

                if (!defaultObj) { //给下面容错
                    defaultObj = {};
                }
                let watchedObj = { _value: {} };
                Object.keys(valueObj).map(key => {
                    if (isObject(valueObj[key])) {
                        watchedObj._value[key] = that._convertValueToWatch(valueObj[key], defaultObj[key],changedCallback); //递归转换为受监视的对象
                    } else {
                        watchedObj._value[key] = valueObj[key];
                    }
                    Object.defineProperty(watchedObj, key, {
                        get: function () {
                            return this._value[key];
                        },
                        set: function (value) {
                            let valid = that.changeIsValid(defaultObj[key],value);

                            if (valid==undefined) {
                                if(isObject(value)){
                                    this._value[key] =that._convertValueToWatch(value,defaultObj[key],changedCallback);
                                    debugger;
                                }else{
                                    this._value[key] = value;
                                }
                                changedCallback();
                            } else {
                                throw Error("类型不合法"+key+valid);
                            }
                        }
                    });
                })
                return watchedObj;
            },
            init() {
debugger;
let that =this;
this._values={};
                Object.keys(defaultSettings).map(key => {
                    let setting = localStorage.getItem(this.getFullKey(key));
                    try {
                        setting = JSON.parse(setting);
                    } catch (e) {
                        setting = {};
                    }
                    setting = this.merge(setting, defaultSettings[key]);
                    if (isObject(setting)){
                        setting = this.convertValueToWatch(setting, defaultSettings[key], key);
                        setting._getValue = this.convertWatchToValue.bind(this, setting);
                        setting._save = this.saveChangedValue.bind(this, setting, key);
                    }

                    Object.defineProperty(Settings,key,{
                        get: function(){
                            return that._values[key];
                        },
                        set:function(value){
                            let valid = that.changeIsValid(defaultSettings[key],value);
                            if (valid==undefined) {
                                if(isObject(value)){
                                    that._values[key] =that._convertValueToWatch(value,defaultSettings[key]);
                                    debugger;
                                }else{
                                    that._values[key] = value;
                                }
                                that.saveChangedValue(that._values[key], key);
                            } else {
                                throw Error("类型不合法"+key+valid);
                            }

                            that._values[key]=value;
                        }

                    })
                    that._values[key] = setting;
                });
            }
        };
        let Settings = {}
        SettingManager.init();
        window.SettingManager = SettingManager;
        window.Settings = Settings;
    }
}