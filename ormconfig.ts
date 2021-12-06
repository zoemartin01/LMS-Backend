import {ConnectionOptions} from 'typeorm';

const dev: ConnectionOptions = {
    name: 'default',
    type: 'postgres',
    host: '127.0.0.1',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'postgres',
    synchronize: true,
    entities: ['src/models/*.ts'],
}

const docker: ConnectionOptions = {
    name: 'default',
    type: 'postgres',
    host: 'db',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'postgres',
    entities: ['src/models/*.ts'],
}

export = process.env.NODE_ENV === 'docker' ? docker : dev;