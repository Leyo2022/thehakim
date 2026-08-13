import type { Script, Entity } from '@/types';

const scriptText = `画面沉入无尽黑暗，远处传来孩童嬉闹声，一层微弱的老者祈祷低语在声响之下缓缓响起。
谢赫・伊萨（画外音）
真主啊，指引我残存的余生。

1 内景 谢赫・伊萨的祈祷室 白天 - 1932
一本《古兰经》摊开在雕花木质经架上，苍老的双手捧着念珠，掌心合十置于胸前祈祷。
谢赫・伊萨（画外音）
宽恕我一生的软弱，
接纳我以您之名所行的一切。
八十多岁的谢赫・伊萨・本・阿里・阿勒哈利法跪在窗边礼拜毯上，屋外孩童的欢笑、喧闹的人间烟火顺着窗缝飘进屋内。
字幕：巴林 麦纳麦 1932
谢赫・伊萨（续）
在回归您面前之前，请让我知晓，
我是否不负托付于我的那份重任。
脚步声缓缓靠近。
努拉（10岁）出现在房门后方，一双眼眸清亮，稚气未脱，心底却初次萌生责任的懵懂。她悄悄侧身躲在门后，想要藏起来。
伊萨抬起布满风霜的脸，目光依旧锐利。
谢赫・伊萨（续）
（打趣）
我知道你就在这儿，努拉。
努拉浑身一僵，满脸窘迫。
努拉
对不起祖父，我们在玩捉迷藏。
谢赫・伊萨
你选的藏身之处实在糟糕，
我一眼就看见了。
老人浅浅一笑，朝她招手。
谢赫・伊萨（续）
过来，陪我坐一会儿吧。
努拉走进房间，坐到祖父身侧，目光落在摊开的古兰经与他手中的念珠上。
努拉
您是在向真主祈求什么吗？
谢赫・伊萨
祈求指引。
努拉
您可是一国的裁决者啊。
谢赫・伊萨
正因如此，我才最需要指引。
努拉
即便到如今也是吗，祖父？
谢赫・伊萨
我还没老到停止学习。
人从师长、父母身上习得道理，
我们穷尽一生，从前辈身上汲取智慧。
努拉
这就是您这般睿智的缘由吗？
谢赫・伊萨
智慧随岁月沉淀而来。
（停顿）
我像你这么大时，
以为梦只存在于睡梦之中。但我现在知道，
那些足以改变世界的梦截然不同。
努拉神情肃穆、专心致志地听着，孩童的她已然察觉，祖父正将一件无比重要的心事托付给自己。
谢赫・伊萨（续）
我穷尽一生，试图读懂父亲的梦想，拆解它背后真正的含义。
努拉
就像解谜一样吗？
谢赫・伊萨紧紧攥住念珠，眼底泛起水雾。
谢赫・伊萨
或许是吧。
努拉
我很擅长解谜。
他转头望向孙女，露出开怀的笑容。
谢赫・伊萨
今早你可有空闲，陪祖父坐一会儿？
努拉
当然，我十分乐意。
谢赫・伊萨
那我便同你讲讲福泽与重担，
还有我这一生习得的道理。
伊萨重新望向窗外，苍老的目光越过嬉闹的孩童、耀眼的晨光，坠入漫长回忆。
谢赫・伊萨（续）
或许我们二人，可以一同解开父亲那个梦想的谜题。`;

export const entityAliases: Entity[] = [
  {
    id: 'ent_1',
    canonicalName: '谢赫・伊萨',
    type: 'character',
    aliases: ['伊萨', '老人', '祖父', '谢赫・伊萨・本・阿里・阿勒哈利法'],
  },
  {
    id: 'ent_2',
    canonicalName: '努拉',
    type: 'character',
    aliases: ['努拉（10岁）', '孙女'],
  },
  {
    id: 'ent_3',
    canonicalName: '孩童',
    type: 'character',
    aliases: [],
  },
  {
    id: 'ent_4',
    canonicalName: '古兰经',
    type: 'prop',
    aliases: ['《古兰经》'],
  },
  {
    id: 'ent_5',
    canonicalName: '雕花木质经架',
    type: 'prop',
    aliases: [],
  },
  {
    id: 'ent_6',
    canonicalName: '念珠',
    type: 'prop',
    aliases: [],
  },
  {
    id: 'ent_7',
    canonicalName: '礼拜毯',
    type: 'prop',
    aliases: [],
  },
  {
    id: 'ent_8',
    canonicalName: '无尽黑暗',
    type: 'vfx',
    aliases: [],
  },
  {
    id: 'ent_9',
    canonicalName: '晨光',
    type: 'vfx',
    aliases: ['耀眼的晨光'],
  },
  {
    id: 'ent_10',
    canonicalName: '孩童嬉闹声',
    type: 'audio',
    aliases: [],
  },
  {
    id: 'ent_11',
    canonicalName: '祈祷低语',
    type: 'audio',
    aliases: [],
  },
  {
    id: 'ent_12',
    canonicalName: '脚步声',
    type: 'audio',
    aliases: [],
  },
  {
    id: 'ent_13',
    canonicalName: '欢笑',
    type: 'audio',
    aliases: ['孩童的欢笑'],
  },
];

export const rawScriptText = scriptText;

export const MOCK_SCRIPT_META = {
  id: 'script_1',
  title: '谢赫・伊萨与努拉',
};