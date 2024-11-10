<script setup lang="ts">
import { IconUnlock, IconDelete,
  IconFolderAdd, IconDownload } from '@arco-design/web-vue/es/icon';
import {onMounted, reactive, ref} from "vue";
import {getFlacLink, getMusicList, Music, unlockFlac} from "./api/api.ts";
import {Message, TableRowSelection} from "@arco-design/web-vue";
import { open } from '@tauri-apps/plugin-dialog';
import {download} from "@tauri-apps/plugin-upload";
import {invoke} from "@tauri-apps/api/core";

const showUnlockModel = ref(true);
const tableLoading = ref(false)
const searchKeyword = ref('热门')
const searchList = reactive<Music[]>([])
const selectedKeys = ref<string[]>([])
const pagination = reactive({total: 0, current: 1, pageSize: 30})
const rowSelection = reactive<TableRowSelection>({
  type: 'checkbox',
  showCheckedAll: true,
  onlyCurrent: false,
})
const audioQuality = ref<'flac' | '320' | '128'>('flac')
const unlockCode = ref<string>('');
const showDrawer = ref(false);

const downloadList = ref<Music[]>([]);

function handleShowUnlock() {
  showUnlockModel.value = !showUnlockModel.value
}

function handleCheckUnlock() {
  unlockFlac(unlockCode.value).then((res) => {
    showUnlockModel.value = false
    Message.info('解锁成功: '+ res)
  }).catch((err) => {
    Message.error(err)
    Message.error('解锁失败，请检查解锁码是否正确')
  })
}

function handlePageChange(page: number) {
  if (pagination.current === page) return
  pagination.current = page;
  selectedKeys.value = [];
  handleQuery();
}

function handleQuery() {
  tableLoading.value = true;
  getMusicList(
      searchKeyword.value,
      pagination.current,
      pagination.pageSize,
  ).then((res) => {
    if (res?.total === 0) return
    if (res?.list) {
      pagination.total = res.total;
      searchList.splice(0, searchList.length, ...res?.list);
    }
  }).catch((e) => console.error(e)).finally(() => tableLoading.value = false);
}

function handleSearch() {
  tableLoading.value = true;
  handleQuery();
  pagination.current = 1;
}


function handleShowDownloadDrawer() {
  showDrawer.value = !showDrawer.value;
}

const saveDirectory = ref('');
function handleChooseDirectory() {
  open({
    multiple: false,
    directory: true,
  }).then((file) => {
    if (file) {
      saveDirectory.value = file;
      Message.info( '选择文件夹: ' + file);
    }
  })
}

function addTask(item: Music) {
  if (downloadList.value.indexOf(item) === -1) {
    downloadList.value.push(item);
    downloadLoop();
  } else {
    Message.info('已存在下载任务: '+ item.name);
  }
}

function clearTask() {
  downloadList.value = [];
}

function addSelectedToTask() {
  searchList.forEach(item => {
    if (selectedKeys.value.includes(item.id)) {
      addTask(item);
    }
  });
}

function deleteTask(item: Music) {
  downloadList.value.splice(downloadList.value.indexOf(item), 1);
}

const downloading = ref(false);

async function downloadLoop() {
  if (downloading.value) return;
  downloading.value = true;
  for (const item of downloadList.value) {
    if (item.total) {
      continue;
    }
    try {
      await downloadMusic(item);
    }catch(err) {}
  }
  downloading.value = false;
}

async function downloadMusic(item: Music) {
  if (saveDirectory.value == '') {
    await open({
      title: '选择下载保存的文件夹',
      multiple: false,
      directory: true,
      canCreateDirectories: true,
    }).then((file) => {
      if (file) {
        saveDirectory.value = file;
        Message.info('选择文件夹: ' + file);
      }
    });
  }
  const res = await getFlacLink(item.id, audioQuality.value, unlockCode.value);
  if (res !== '') {
    const suffix = audioQuality.value === 'flac' ? 'flac' : 'mp3';
    const filename = `${saveDirectory.value}/${item.name.replace(/[\/\\]/g, '_')}${item.albumName ? '(' + item.albumName.replace(/[\/\\]/g, '_') + ')' : ''} - ${item.singers.join('、').replace(/[\/\\]/g, '_')}.${suffix}`;
    try {
      await invoke('file_exists', { value: filename });
    } catch (err) {
      // 确保 err 是字符串
      Message.error(typeof err === 'string' ? err : '发生错误'); // 捕获并处理 invoke 的异常
      return; // 如果发生错误，可以选择提前返回
    }

    let downTotal = 0;
    await download(
        res,
        filename,
        (progress) => {
          if (downTotal === 0) {
            item.total = (progress.total / 1024 / 1024).toFixed(1) + 'MB';
          }
          downTotal += progress.progress;
          item.progress = (downTotal / progress.total * 100).toFixed(0) + '%'; // 下载进度时调用的回调函数
        }
    ).catch(err => {
      Message.error(err);
    });
  }
}

onMounted(()=>{
  handleQuery()
})
</script>

<template>
  <div class="main-layout">
    <a-layout style="height: 100vh;">
      <a-layout-header>
        <a-row align="center" style="height: 100%;">
          <a-col flex="auto">
            <a-space>
              <a-select :style="{width:'7.5rem'}" v-model="audioQuality">
                <a-option value="128">普通</a-option>
                <a-option value="320">极高</a-option>
                <a-option value="flac">无损</a-option>
                <template #prefix>
                  音质
                </template>
              </a-select>
              <a-button type="primary" status="warning" @click="handleShowUnlock">
                <template #icon>
                  <icon-unlock />
                </template>
              </a-button>
              <a-modal width="20rem" v-model:visible="showUnlockModel" :footer="false" title="人工验证提示">
                <a-typography-paragraph>
                  <ol>
                    <li>微信搜索微信公众号：【黑话君】</li>
                    <li>公众号中发送【音乐密码】，获取解锁码</li>
                    <li>填入下方解锁，解锁码有效时间为12小时</li>
                  </ol>
                </a-typography-paragraph>
                <a-input-search v-model="unlockCode" placeholder="解锁码" button-text="确认解锁" search-button @search="handleCheckUnlock"/>
              </a-modal>
              <a-input placeholder="请输入搜索词" v-model="searchKeyword"/>
              <a-button type="primary" :disabled="tableLoading" @click="handleSearch">搜索</a-button>
              <a-tooltip v-if="selectedKeys.length > 0" content="添加到播放列表" @click="addSelectedToTask" position="bottom">
                <a-button type="primary" size="medium" status="success">
                  <template #icon>
                    <icon-folder-add />
                  </template>
                </a-button>
              </a-tooltip>
              <a-badge :count="downloadList.length">
                <a-button @click="handleShowDownloadDrawer">下载列表</a-button>
              </a-badge>
            </a-space>
          </a-col>
        </a-row>
      </a-layout-header>
      <a-layout-content>
        <a-table
            row-key="id"
            :data="searchList"
            :row-selection="rowSelection"
            v-model:selectedKeys="selectedKeys"
            :pagination="pagination"
            :scroll="{ x: '100%',y: '100%' }"
            @page-change="handlePageChange"
            :loading="tableLoading"
        >
          <template #columns>
            <a-table-column title="歌曲" data-index="name"/>
            <a-table-column title="专辑" data-index="albumName"/>
            <a-table-column title="歌手" data-index="singers"/>
            <a-table-column title="平台" data-index="platform" :width="60"/>
            <a-table-column title="操作" :width="60">
              <template #cell="{ record }">
                <icon-download style="cursor: pointer" @click="addTask(record)"/>
              </template>
            </a-table-column>
          </template>
        </a-table>
      </a-layout-content>
  </a-layout>
    <a-drawer :width="'60vw'" :visible="showDrawer" @cancel="showDrawer = false" @close="showDrawer = false" :footer="false">
      <template #header>
          <a-space>
            <a-button type="text" shape="circle" @click="handleChooseDirectory">
              <icon-folder-add />
            </a-button>
            <a-typography-paragraph
                :ellipsis="{ rows: 1, showTooltip: true}"
                type="secondary"
                :style="{ width: '45vw',maxWidth: '45vw',minWidth: '45vw' }"
            >{{ saveDirectory ? saveDirectory : '没有选择文件夹' }}</a-typography-paragraph>
            <a-button v-if="downloadList.length > 0" type="text" shape="circle" @click="clearTask">清空</a-button>
          </a-space>
      </template>
      <a-list size="small">
        <a-list-item v-for="(item, index) in downloadList" :key="index">
          <a-list-item-meta>
            <template #title>
              <a-typography-paragraph
                  :ellipsis="{ rows: 1, showTooltip: true}"
              >{{ item.name }} {{ item.albumName ? '(' + item.albumName + ')' : '' }}</a-typography-paragraph>
            </template>
            <template #description>
              <a-typography-paragraph
                  :ellipsis="{ rows: 1, showTooltip: true}"
                  type="secondary"
              >{{ item.singers.join(',') }}</a-typography-paragraph>
            </template>
            <template #avatar>
              <a-avatar shape="square">
                <img
                    alt="avatar"
                    :src="item.picUrl"
                />
              </a-avatar>
            </template>
          </a-list-item-meta>
          <template #actions>
            <div v-if="item.total">{{ item.total }}</div>
            <div v-if="item.progress">{{ item.progress }}</div>
            <icon-delete v-if="!item.total" @click="deleteTask(item)" />
          </template>
        </a-list-item>
      </a-list>
    </a-drawer>
  </div>
</template>

<style scoped>
.main-layout :deep(.arco-layout-content) {
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: var(--color-white);
  font-stretch: condensed;
  text-align: center;
}

.main-layout :deep(.arco-layout-header) {
  padding: 0 .5rem;
  height: 3.5rem;
  background-color: rgba(139, 196, 221, 0.5);
}

.main-layout :deep(.arco-layout-content) {
  background-color: rgba(0, 0, 0, 0);
  overflow: -webkit-paged-y;
}

.main-layout :deep(.arco-popover-content) {
  height: 100% !important;
}
.icon-style {
  font-size: 2rem;
  cursor: pointer;
}
:deep(.arco-table-pagination) {
  margin-top: auto !important;
  padding-bottom: .2rem !important;
}

:deep(div.arco-typography, p.arco-typography) {
  margin-bottom: 0 !important;
}
:deep(.arco-list-item) {
  padding: .4rem !important;
}
:deep(.arco-list-item-meta-content) {
  width: 100% !important;
}
</style>
