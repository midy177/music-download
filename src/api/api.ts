import { fetch } from '@tauri-apps/plugin-http';
import {invoke} from "@tauri-apps/api/core";
import {Message} from "@arco-design/web-vue";

export interface Response<T> {
    success: boolean;
    message: string;
    code: number;
    result: T;
    timestamp: number;
}

export interface ListResult<T> {
    total: number;
    list: T[];
}

export interface Music {
    singers: string[];
    albumName: string;
    picUrl: string;
    hasMV: boolean;
    hasHQ: boolean;
    name: string;
    albumId: string;
    id: string;
    platform: string;
    hasAlbum: boolean;
    hasSQ: boolean;
    progress?: string;
    total?: string;
}

export interface MusicList {
    total: number;
    list: Music[];
}

// 获取音乐列表
export async function getMusicList(keyword: string, page: number, size: number): Promise<MusicList | null> {
    const baseURL = "https://api.flac.life/search/qq";

    // 构建查询参数
    const params = new URLSearchParams();
    params.append("keyword", keyword);
    params.append("page", page.toString());
    params.append("size", size.toString());

    // 构建完整URL
    const fullURL = `${baseURL}?${params.toString()}`;

    // 创建请求
    const response = await fetch(fullURL, {
        method: "GET",
        headers: {
            "accept": "application/json, text/javascript, */*; q=0.01",
            "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
            "cache-control": "no-cache",
            "origin": "https://flac.life",
            "pragma": "no-cache",
            "priority": "u=1, i",
            "referer": "https://flac.life/",
            "sec-ch-ua": `"Microsoft Edge";v="129", "Not=A?Brand";v="8", "Chromium";v="129"`,
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "macOS",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0"
        }
    });
    if (!response.ok) {
        throw new Error(response.statusText);
    }

    // 读取响应体
    const result: Response<ListResult<Music>> = await response.json();
    if (result.code !== 200) {
        throw new Error(result.message);
    }

    return {
        total: result.result.total,
        list: result.result.list
    };
}

 export async function getFlacLink(songID: string, csq: string, unlockCode: string): Promise<string> {
    if (!songID) {
        throw new Error("songID is empty");
    }
    if (!unlockCode) {
        throw new Error("unlockCode is empty");
    }
    const rawUrl = `https://api.flac.life/url/qq/${songID}/${csq}`;

    // 创建请求
    const response = await fetch(rawUrl, {
        method: 'GET',
        headers: {
            "accept": "application/json, text/javascript, */*; q=0.01",
            "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
            "cache-control": "no-cache",
            "origin": "https://flac.life",
            "pragma": "no-cache",
            "priority": "u=1, i",
            "referer": "https://flac.life/",
            "sec-ch-ua": `"Microsoft Edge";v="129", "Not=A?Brand";v="8", "Chromium";v="129"`,
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "macOS",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "unlockcode": unlockCode,
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0"
        }
    });

    if (!response.ok) {
        throw new Error(response.statusText);
    }

    // 读取响应体
    const result: Response<string> = await response.json();
    if (result.code !== 200) {
        throw new Error(`获取下载链接失败: ${result.message}`);
    }
    return result.result;
}


export async function unlockFlac(unlockCode: string): Promise<any> {
    if (!unlockCode) {
        throw new Error("unlockCode is empty");
    }
    const rawUrl = `https://api.flac.life/unlock/${unlockCode}`;

    // 创建请求
    const response = await fetch(rawUrl, {
        method: 'GET',
        headers: {
            "accept": "application/json, text/javascript, */*; q=0.01",
            "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
            "cache-control": "no-cache",
            "origin": "https://flac.life",
            "pragma": "no-cache",
            "priority": "u=1, i",
            "referer": "https://flac.life/",
            "sec-ch-ua": `"Chromium";v="130", "Microsoft Edge";v="130", "Not?A_Brand";v="99"`,
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "macOS",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
        }
    });

    if (!response.ok) {
        throw new Error(response.statusText);
    }

    // 读取响应体
    const result: Response<string> = await response.json();
    if (result.code !== 200) {
        throw new Error(`解锁失败: ${result.message}`);
    }
    return result.result;
}

interface CustomEventPayload {
    action: 'play_local_file' | 'play_remote_url' | 'pause' | 'recovery' | 'volume';
    data?: string | number;
}

export const playAudio = async (link: string) => {
    const event: CustomEventPayload = { action: 'play_remote_url', data: link };
    await invoke("handle_event", { event: JSON.stringify(event) }).catch((error) => Message.error(error));
};
