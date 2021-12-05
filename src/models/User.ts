import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { UserRole } from "../types/enums/user-role";

/**
 * A User model.
 * 
 * @property {number} id The id of the user.
 * @property {string} email The email of the user.
 * @property {string} password The password of the user.
 * @property {Date} createdAt The created at date of the user.
 * @property {Date} updatedAt The updated at date of the user.
 * @property {UserRole} role The role of the user.
 * @property {boolean} emailVerification The email verification status of the user.
 */
@Entity()
export class User {
    /**
     * The id of the user.
     */
    @PrimaryGeneratedColumn()
    id: number;

    /**
     * The email of the user.
     */
    @Column()
    email: string;

    /**
     * The password of the user.
     */
    @Column()
    password: string;
    
    /**
     * The created at date of the user.
     */
    @Column()
    createdAt: Date;

    /**
     * The updated at date of the user.
     */
    @Column()
    updatedAt: Date;

    /**
     * The role of the user.
     */
    @Column()
    role: UserRole;

    /**
     * The email verification status of the user.
     */
    @Column()
    emailVerification: boolean;