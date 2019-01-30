import {settingManagerInit} from "../src/index";
import {storageMock} from "../mocks/mocks";

export let defaultSettings = {
    item1: 123,
    object1: {
        key1: {
            subkey11: 123
        }
    },
    brokenObject:{
        key1:123
    },
    last_way: {
        mode: 'offline',
        offtrade: 'offtrade',
        ortherName: 'ortherName',
        a: {
            f: "asd",
            num: 123
        }
    },
}
window.isTest = 1;
let storage = {

    item1: 456,
    brokenObject:{
        key1:654
    },
    last_way: {
        mode: 'offline1',
        a: {
            f: "asd123",
            c: 'extra'
        }
    },
}
let storageStr = {};
Object.keys(storage).map(key => {
    storageStr[key] = JSON.stringify(storage[key]);
})
storageStr.brokenObject+="}";//break this storage

window.storage = storageMock(storageStr);
window.userInfo = {
    userNick: "浅梦",
}
settingManagerInit();
// test("1",()=>{
// 	expect(3).toBe(3);
// })
function getStorageItem(key){
    return JSON.parse(window.storage.getItem(key));
}

test("read",() => {
    expect(Settings.item1).toBe(456);
    expect(Settings.object1.key1.subkey11).toBe(123);
    expect(Settings.last_way.mode).toBe('offline1');
    expect(Settings.last_way.offtrade).toBe('offtrade');
    expect(Settings.last_way.ortherName).toBe('ortherName');
    expect(Settings.last_way.a.f).toBe('asd123');
    expect(Settings.last_way.a.c).toBe('extra');
})
test('read-broken',()=>{
    expect(Settings.brokenObject.key1).toBe(123);
})
test("write",() => {
    Settings.last_way.mode = 'fuckyou';
    expect(getStorageItem('last_way').mode).toBe('fuckyou');
    Settings.last_way.a.f = '123123123';
    expect(getStorageItem('last_way').a.f).toBe('123123123');
})
test("write-validate",() => {
    expect(() => {
        Settings.last_way.a.f = {}
    }).toThrow();
    Settings.last_way.a.f = 123123123
    expect(getStorageItem('last_way').a.f).toBe(123123123);
    Settings.last_way.a.num = '123';
    expect(() => {
        Settings.last_way.a.num = '123a'
    }).toThrow();
    expect(() => {
        Settings.last_way.a.num = {}
    }).toThrow();
    expect(() => {
        Settings.last_way.a = {}
    }).toThrow();
    expect(() => {
        Settings.last_way.a = {f:'asd123'}
    }).toThrow();
    expect(() => {
        Settings.last_way.a = {f:'asd123',num:"456a"}
    }).toThrow();

})
// test("write-validate1",()=>{
//     // expect(()=>{Settings.last_way.a.f={}}).toThrow();
//     // Settings.last_way.a.f=123123123
//     // expect(getStorageItem('last_way').a.f).toBe(123123123);
//     // Settings.last_way.a.num='123';
//    Settings.last_way.a={}
// })

test("write-extra",() => {
    Settings.last_way.a.c = "extraChanged";
    expect(getStorageItem('last_way').a.c).toBe("extraChanged");
    Settings.last_way.a.c = {b: 1,d: '2'};
    ;
    expect(getStorageItem('last_way').a.c.b).toBe(1);
    expect(getStorageItem('last_way').a.c.d).toBe('2');
})
test("write-root",() => {
    Settings.item1 = 789;
    expect(getStorageItem('item1')).toBe(789);
    expect(() => {
        Settings.item1 = '123a'
    }).toThrow();

    expect(() => {
        Settings.object1={
            key2:''
        }
    }).toThrow();
    Settings.object1={
        key1:{
            subkey11:456,
            subkey12:654
        },
        key2:{
            subkey21:987,
            subkey22:789
        }
    }
    expect(getStorageItem('object1').key1.subkey11).toBe(456);
    expect(getStorageItem('object1').key1.subkey12).toBe(654);
    expect(getStorageItem('object1').key2.subkey21).toBe(987);
    expect(getStorageItem('object1').key2.subkey22).toBe(789);

})
