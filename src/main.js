const program = require('commander');
const path = require('path');
const { version } = require('./constans'); // 获取版本号
// 多个指令命令的集合   运行react-template create xx
const mapAction = {
  create: {
    // 创建模板
    alias: 'c',
    description: '创建一个项目',
    examples: ['tp-cli create <project-name>'],
  },
  config: {
    alias: 'conf',
    description: '配置',
    examples: ['tp-cli config set <k> <v>', 'tp-cli config get <k>'],
  },
  '*': {
    // 根据自己的情况配置别的命令
    alias: '',
    description: '没有找到命令',
    examples: [],
  },
};
// 相等于 Object.key() 循环遍历创建命令
// 配置命令的名字
// 命令别的名称
// 命令对应的描述
// 动态加载解析配置项目中的解析函数
Reflect.ownKeys(mapAction).forEach((action) => {
  program
    .command(action)
    .alias(mapAction[action].alias)
    .description(mapAction[action].description)
    .action(() => {
      if (action === '*') {
        // 访问不到对应的命令 就打印找不到命令
        console.log(mapAction[action].description);
      } else {
        require(path.resolve(__dirname, action))(...process.argv.slice(3));
      }
    });
});
program.on('--help', () => {
  console.log('\r\nExamples:');
  Reflect.ownKeys(mapAction).forEach((action) => {
    mapAction[action].examples.forEach((example) => {
      console.log(`${example}`);
    });
  });
});

// console.log(process.argv);//当前进程的参数  react-template --help运行出结果
// console.log(program)
// 解析用户传递的参数，然后根据配置自动执行回调
program.version(version).parse(process.argv);
console.log('hello!');
