import { Connection } from 'typeorm';
import { Factory, Seeder } from 'typeorm-seeding';
// import { RetailerDomain } from '../../models/retailer.domain.entity';
// import { Retailer } from '../../models/retailer.entity';

export default class CreateRetailers implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<void> {
    // const retailers = await factory(Retailer)().createMany(10);
    // retailers.forEach(async (retailer) => {
    //   await factory(RetailerDomain)({ retailer }).createMany(3);
    // });
  }
}
