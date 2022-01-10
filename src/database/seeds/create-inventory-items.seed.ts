import { Connection } from 'typeorm';
import { Factory, Seeder } from 'typeorm-seeding';
import { InventoryItem } from '../../models/inventory-item.entity';

export default class CreateInventoryItems implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<any> {
    await factory(InventoryItem)().createMany(10);
  }
}
