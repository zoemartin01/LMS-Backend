import { Factory, Seeder } from 'typeorm-seeding';
import { Connection } from 'typeorm';
import { GlobalSetting } from '../../models/global_settings.entity';

const lorem_markdownum = `# Tenebrae scelus vidi

    ## Bello transierant
    
    Lorem markdownum sit inter equina ultroque nervoque Salmacis amplexuque
    volucresque bracchia cum *Latoidos* tantae et nullis quos extrema. Cressa auris,
    veste! Primisque enim clivoque: *erepta arserunt* veniam ante vocat vestra,
    Aethiopasque quoque thalamo nisi, nam non fecere. Messeniaque verba valle,
    Aetola, [titubare](http://obstantiseffodiuntur.org/cultu) a Iovem maiora
    causamque? Oculos iugalis fortibus cursus, de mors haec herbas toto tinnitibus
    saetae iactura videri freta.
    
    ## Hic nitentem Diana credit barbaricoque frena in
    
    Venit sol nostris, haeserat amor Victoria hoc munus spoliare cervice, sed vasti.
    Promittit vultus decerpta et quod falsa quam robustior abis vos; est ipse.
    Feruntque dolenti cruentum.
    
        var terminal = textGnuExcel.flamingSystem.trackball(daemon_only);
        adfCpcRpm -= ppc.half_ip(4, 4 + infotainment_ddr) + bug_javascript(
                bare_dial_laptop, hdtv_midi_impression);
        menuPage -= fileBox;
        num_bus.xRiscPower = digitalStackMountain;
        var certificateNum = path_vle(sample_risc_pram(twitter), digital_hard) +
                tunnelingCycleDvd;
    
    ## Genus cum esse eripuit moriturae poscis
    
    Ipse cui circuit inpendere nondum deus et aequore dixerat, tantis. Tirynthius
    freta est herbis, sustinet aequor pariter gemino, inpietate tuentur ardor septem
    missus, illa!
    
    1. Mens inque
    2. Miseram Hyleusque ea quoque si vestra
    3. Solis trabesque pater
    4. Quae quoque dextra manibus amplexa
    
    ## Plenissima crede plangere adita
    
    *Possis* guttura Troum; cui duos aret genetrixque idem, petunt sola **intus**,
    tu manibus. Numeratur regno! Foret aut, alii fit! Mea te quantum odiumque
    Philemon est invita, infans securaque piscosa.
    
    Adsumere sua ipsa sum et fictus materiam, viderunt Hippotadae? Erat postquam
    gradus nomina novitate **genitus** trepidantem felicia.`;

export default class CreateGlobalSettings implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<void> {
    const repository = connection.getRepository(GlobalSetting);

    await repository.upsert(
      {
        key: 'user.max_recordings',
        value: '5',
        description: 'Maximum Recordings per User',
      },
      ['key']
    );

    await repository.upsert(
      {
        key: 'recording.auto_delete',
        value: '86400000',
        description: 'Time after a recording gets automatically deleted',
      },
      ['key']
    );

    await repository.upsert(
      {
        key: 'static.homepage',
        value: lorem_markdownum,
        description: 'Homepage Content (in Markdown)',
      },
      ['key']
    );

    await repository.upsert(
      {
        key: 'static.lab_rules',
        value: lorem_markdownum,
        description: 'HWLab Rules (in Markdown)',
      },
      ['key']
    );

    await repository.upsert(
      {
        key: 'static.safety_instructions',
        value: lorem_markdownum,
        description: 'Static Safety Instructions (in Markdown)',
      },
      ['key']
    );
  }
}
