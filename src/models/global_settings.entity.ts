import { Column, Entity } from "typeorm";

/**
 * Global Setting
 * 
 * @typedef {Object} GlobalSetting
 * @class
 * 
 * @property {string} key - The key of the setting
 * @property {string} value - The value of the setting
 * @property {string} description - The description of the setting
 */
@Entity()
export class GlobalSetting {
    /**
     * The key of the setting in the format "scope.setting_name"
     * 
     * @type {string}
     */
    @Column({ type: "varchar", length: 255, unique: true })
    public key: string;

    /**
     * The value of the setting
     * 
     * @type {string}
     */
    @Column()
    public value: string;

    /**
     * The description of the setting
     * 
     * @type {string}
     * @default ""
     */
    @Column({ default: "" })
    public description: string;
}