import {KeyInputContainer} from "./KeyInputContainer";
import {MetaKey, MetaKeysMax} from "./MetaKey";
import {PressType} from "./PressType";
import {KeyCallback} from "./KeyCallback";
import {Logger} from "../../Logger";
import {Quick} from "../../Quick";
import {Hooks} from "../../Hooks";


Hooks.addBeforeMainHook(() => InputManagerKeyboardHandler.Init());

export class InputManagerKeyboardHandler {
    private constructor() {}
    public static Init() {
        TriggerAddAction(this.keyInputTrigger, () => this.onKeyAction());
    }

    public static keyInputTrigger: trigger = CreateTrigger();
    public static registeredKeys: KeyInputContainer[] = [];

    private static onKeyAction() {
        let key = BlzGetTriggerPlayerKey();
        let metaKey = BlzGetTriggerPlayerMetaKey();
        let isDown = BlzGetTriggerPlayerIsKeyDown();
        let inputContainer = this.getKeyContainer(key);

        if (inputContainer.isDown(GetPlayerId(GetTriggerPlayer())) && isDown) return;

        inputContainer.setIsDown(isDown, GetPlayerId(GetTriggerPlayer()));
        for (let index = 0; index < inputContainer.callbacks.length; index += 1) {
            let callback = inputContainer.callbacks[index];
            if (callback.enabled && (callback.metaKeys.indexOf(metaKey) >= 0 || callback.metaKeys.indexOf(MetaKey.ALL) >= 0)) {
                if ((isDown && callback.pressType == PressType.PRESS)
                    || (!isDown && callback.pressType == PressType.RELEASE)) {
                    callback.triggeringPlayer = GetTriggerPlayer();
                    xpcall(() => {
                        callback.callback(callback);
                    }, Logger.critical);
                }
            }
        }
    }

    public static registerNewKeyEvent(key: oskeytype) {
        for (let i = 0; i < PLAYER_NEUTRAL_AGGRESSIVE; i++) {
            for (let meta = 0; meta <= MetaKeysMax; meta++) {
                BlzTriggerRegisterPlayerKeyEvent(this.keyInputTrigger, Player(i), key, meta, true);
                BlzTriggerRegisterPlayerKeyEvent(this.keyInputTrigger, Player(i), key, meta, false);
            }
        }
    }

    public static removeKeyCallback(keyCallback: KeyCallback) {
        let container = this.getKeyContainer(keyCallback.key);
        if (container.callbacks.indexOf(keyCallback) >= 0) {
            Quick.Slice(container.callbacks, container.callbacks.indexOf(keyCallback));
        }
    }

    public static getKeyContainer(key: oskeytype) {
        let handleId = GetHandleId(key);
        if (this.registeredKeys[handleId] == null) {
            let newKey = new KeyInputContainer(key);
            this.registeredKeys[handleId] = newKey;
            this.registerNewKeyEvent(key);
            return newKey;
        } else {
            return this.registeredKeys[handleId];
        }
    }

    public static addKeyboardPressCallback(key: oskeytype, callback: (this: void, key: KeyCallback) => void, metaKeys?: MetaKey[]) {
        let container = this.getKeyContainer(key);
        let input = new KeyCallback(key, callback, PressType.PRESS, metaKeys);
        container.callbacks.push(input);
        return input;
    }

    public static addKeyboardReleaseCallback(key: oskeytype, callback: (this: void, key: KeyCallback) => void, metaKeys?: MetaKey[]) {
        let container = this.getKeyContainer(key);
        let input = new KeyCallback(key, callback, PressType.RELEASE, metaKeys);
        container.callbacks.push(input);
        return input;
    }

    public static isKeyButtonHeld(key: oskeytype, triggeringPlayer: player) {
        return this.getKeyContainer(key).isDown(GetPlayerId(triggeringPlayer));
    }
}