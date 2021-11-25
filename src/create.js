const axios = require('axios');
const ora = require('ora'); // loading的样式
const inquirer = require('inquirer'); // 选择模板
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
let downloadGit = require('download-git-repo');
// 拉取模板
downloadGit = promisify(downloadGit); // 可以把异步的api转换成promise形式
const MetalSmith = require('metalsmith'); // 遍历文件夹，找需不需要渲染

// consolidate 统一所有的模板引擎
let { render } = require('consolidate').ejs;

render = promisify(render);
let ncp = require('ncp');
const { downLoadDirectory } = require('./constans');

ncp = promisify(ncp); // create的功能是创建项目
// 拉取你自己的所有的项目列出来 让用户选 安装哪个项目 projectName
// 选择完成后，在显示所有的版本号 1.0
// 可能还需要用户配置一些数据来结合来渲染项目

// https://api.github.com/orgs/react-template/repos 获取组织下的仓库

// 获取项目列表
const fetchRepoList = async () => {
  // 此处保管项目地址
  const { data } = await axios.get('https://api.github.com/orgs/react-Itemplate/repos');
  return data;
};

// 封装loading
const waitFnloading = (fn, message) => async (...args) => {
  const spinner = ora(message);
  spinner.start();
  const result = await fn(...args);
  spinner.succeed();
  return result;
};
// 抓取tag列表
const fetchTagList = async (repo) => {
  // 此处获取项目tag信息
  const { data } = await axios.get(
    `https://api.github.com/repos/react-Itemplate/${repo}/tags`,
  );

  return data;
};
// 显示下载的最终目录
const download = async (repo, tag) => {
  let api = `react-Itemplate/${repo}`;
  if (tag) {
    api += `#${tag}`;
  }
  const dest = `${downLoadDirectory}/${repo}`;
  await downloadGit(api, dest);
  return dest;
};

module.exports = async (projectName) => {
  // projectName是src/mian.js文件第42行的传进参数
  let repos = await waitFnloading(fetchRepoList,
    'fetch template ....')();
  repos = repos.map((item) => item.name);
  const { repo } = await inquirer.prompt({
    // 在命令行中询问客户问题
    name: 'repo', // 获取选择后的结果
    type: 'list',
    message: '请选择一个项目',
    choices: repos,
  });

  // 通过当前选择的项目，拉取对应的版本
  // 获取对应的版本号
  let tags = await waitFnloading(fetchTagList, 'fetch tags ....')(repo);
  tags = tags.map((item) => item.name);
  // console.log(tags, 'tags');

  const { tag } = await inquirer.prompt({
    name: 'tag',
    type: 'list',
    message: 'please choise tags to create project',
    choices: tags,
  });

  // console.log(repo,tag);//下载模板 版本
  // 把模板放到一个临时目录里存好，以备后期使用
  const result = await waitFnloading(download, 'download template')(repo, tag);
  // console.log(result, 'mulu'); // 下载的目录

  // 拿到下载的目录 直接拷贝当前执行的目录下即可 ncp

  // 有的时候用户可以定制下载模板中的内容，拿package.json文件为例，用户可以根据提示给项目命名、
  // 设置描述等，生成最终的package.json文件 ask.json网址：https://github.com/react-Itemplate/vue-template/blob/master/ask.js
  // 如果有ask.js文件直接下载
  if (!fs.existsSync(path.join(result, 'ask.json'))) {
    // 简单模版 直接下载
    await ncp(result, path.resolve(projectName));
  } else {
    // 复杂的模板  把git上的项目下载下来，如果有ask文件就是一个复杂的模板，我们需要用户选择，选择后编译模板
    await new Promise((resolve, reject) => {
      MetalSmith(__dirname) // 如果你传入路径，默认遍历当前路径下的src文件夹
        .source(result)
        .destination(path.resolve(projectName))
        .use(async (files, metal, done) => {
          // console.log(files)
          const args = require(path.join(result, 'ask.js'));
          const obj = await inquirer.prompt(args);
          // console.log(obj);//用户填写的结果
          const meta = metal.metadata();
          Object.assign(meta, obj);
          delete files['ask.js'];
          done();
        })
        .use((files, metal, done) => {
          const obj = metal.metadata();
          Reflect.ownKeys(files).forEach(async (file) => {
            // 是要处理的文件
            if (file.includes('js') || file.includes('json')) {
              const content = files[file].contents.toString(); // 文件的内容
              if (content.includes('<%')) {
                // console.log(content, 'content');
                conteny = await render(content, obj);
                files[file].contents = Buffer.from(content); // 渲染结果
              }
            }
          });
          // 2.让用户填写的信息取渲染模板
          // 根据用户新的输入 下载模板
          // console.log(metal.metadata())
          done();
        })
        .build((err) => {
          if (err) {
            reject();
          } else {
            resolve();
          }
        });
    });
  }
};
