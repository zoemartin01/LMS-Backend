import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { isDate, isUUID } from 'class-validator';
import { describe } from 'mocha';
import { Column, Entity, getRepository, Repository } from 'typeorm';
import { useRefreshDatabase } from 'typeorm-seeding';
import { BaseEntity } from './base.entity';

chai.should();
chai.use(chaiAsPromised);

@Entity()
export class Dummy extends BaseEntity {
  @Column({
    default: '',
  })
  property: string;
}

describe('Base Entity', () => {
  let repository: Repository<Dummy>;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    await useRefreshDatabase({ connection: 'default' });
    repository = getRepository(Dummy);
  });

  describe('Create Entity', () => {
    it('should set an id in the uuid format', async () => {
      const dummy = await repository.save(new Dummy());

      expect(dummy).to.have.a.property('id');
      expect(isUUID(dummy.id)).to.be.true;
    });

    it('should set the createdAt and updatedAt date', async () => {
      const dummy = await repository.save(new Dummy());

      expect(dummy).to.have.a.property('createdAt');
      expect(dummy).to.have.a.property('updatedAt');

      expect(isDate(dummy.createdAt)).to.be.true;
      expect(isDate(dummy.updatedAt)).to.be.true;

      expect(dummy.createdAt.getTime()).to.equal(dummy.updatedAt.getTime());
    });

    it('should not set the deletedAt date', async () => {
      const dummy = await repository.save(new Dummy());

      expect(dummy).to.have.a.property('deletedAt').to.be.null;
    });
  });

  describe('Update Entity', () => {
    it('should update updatedAt on update', async () => {
      const dummy = await repository.save(new Dummy());
      await repository.update(dummy.id, { property: 'update' });
      const updatedDummy = await repository.findOneOrFail(dummy.id);

      expect(updatedDummy).to.have.a.property('updatedAt');
      expect(updatedDummy.updatedAt.getTime()).to.not.equal(
        dummy.updatedAt.getTime()
      );
    });
  });

  describe('Delete Entity', () => {
    it('should set deletedAt on soft delete', async () => {
      const dummy = await repository.save(new Dummy());
      await repository.softRemove(dummy);
      const deletedDummy = await repository.findOneOrFail(dummy.id, {
        withDeleted: true,
      });

      expect(deletedDummy).to.have.a.property('deletedAt').and.not.be.null;
    });
  });
});
