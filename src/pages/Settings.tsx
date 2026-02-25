import { useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { NumberField } from "@base-ui/react/number-field";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog } from "@base-ui/react/dialog";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { zhCN } from "react-day-picker/locale";
import { sileo } from "sileo";
import { useNavigate } from "react-router-dom";
import StickyHeader from "../components/StickyHeader.tsx";
import {
  getSettings,
  saveSettings,
  type Settings as SettingsType,
  type ColorMode,
} from "../lib/settings.ts";
import { db } from "../lib/db.ts";
import { getAuthSession, logout } from "../lib/auth.ts";
import { useCurrentUserId } from "../lib/data-scope.ts";

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SettingsType>(getSettings);
  const [exportDone, setExportDone] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [checking, setChecking] = useState(false);
  const session = getAuthSession();
  const userId = useCurrentUserId();
  const defaultClassNames = getDefaultClassNames();

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log("SW Registered:", r);
    },
    onRegisterError(error: Error) {
      console.error("SW registration error", error);
    },
  });

  async function handleCheckUpdate() {
    setChecking(true);
    sileo.info({ title: "正在检查更新…" });
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      if (registration) {
        await registration.update();
        // Give a moment for the SW to detect changes
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (!needRefresh) {
          sileo.success({ title: "已是最新版本" });
        } else {
          sileo.info({
            title: "发现新版本",
            description: "点击下方按钮更新",
          });
        }
      } else {
        sileo.success({ title: "已是最新版本" });
      }
    } catch {
      sileo.error({ title: "检查更新失败", description: "请检查网络连接" });
    } finally {
      setChecking(false);
    }
  }

  const selectedDate = settings.dueDate
    ? new Date(settings.dueDate + "T00:00:00")
    : undefined;

  function update(patch: Partial<SettingsType>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  }

  async function handleExport() {
    if (!userId) {
      sileo.error({ title: "请先登录" });
      return;
    }
    const [
      sessions,
      contractionSessions,
      contractions,
      hospitalBagItems,
      feedingRecords,
    ] = await Promise.all([
      db.sessions.where("userId").equals(userId).toArray(),
      db.contractionSessions.where("userId").equals(userId).toArray(),
      db.contractions.where("userId").equals(userId).toArray(),
      db.hospitalBagItems.where("userId").equals(userId).toArray(),
      db.feedingRecords.where("userId").equals(userId).toArray(),
    ]);
    const data = JSON.stringify(
      {
        sessions,
        contractionSessions,
        contractions,
        hospitalBagItems,
        feedingRecords,
      },
      null,
      2,
    );
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `宝宝助手_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportDone(true);
    setTimeout(() => setExportDone(false), 2000);
  }

  async function handleImport() {
    if (!userId) {
      sileo.error({ title: "请先登录" });
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const data = JSON.parse(text);
      let count = 0;
      // Support both old format (array) and new format (object with keys)
      if (Array.isArray(data)) {
        const normalized = data.map((item) => ({ ...item, userId }));
        await db.sessions.bulkPut(normalized);
        count = normalized.length;
      } else {
        if (data.sessions) {
          const sessions = data.sessions.map((item: Record<string, unknown>) => ({ ...item, userId }));
          await db.sessions.bulkPut(sessions);
          count += sessions.length;
        }
        if (data.contractionSessions) {
          const contractionSessions = data.contractionSessions.map((item: Record<string, unknown>) => ({ ...item, userId }));
          await db.contractionSessions.bulkPut(contractionSessions);
          count += contractionSessions.length;
        }
        if (data.contractions) {
          const contractions = data.contractions.map((item: Record<string, unknown>) => ({ ...item, userId }));
          await db.contractions.bulkPut(contractions);
          count += contractions.length;
        }
        if (data.hospitalBagItems) {
          const hospitalBagItems = data.hospitalBagItems.map((item: Record<string, unknown>) => ({ ...item, userId }));
          await db.hospitalBagItems.bulkPut(hospitalBagItems);
          count += hospitalBagItems.length;
        }
        if (data.feedingRecords) {
          const feedingRecords = data.feedingRecords.map((item: Record<string, unknown>) => ({ ...item, userId }));
          await db.feedingRecords.bulkPut(feedingRecords);
          count += feedingRecords.length;
        }
      }
      sileo.success({
        title: "导入成功",
        description: `共导入 ${count} 条记录`,
      });
    };
    input.click();
  }

  async function handleClear() {
    if (!userId) {
      sileo.error({ title: "请先登录" });
      return;
    }

    await Promise.all([
      db.sessions.where("userId").equals(userId).delete(),
      db.contractionSessions.where("userId").equals(userId).delete(),
      db.contractions.where("userId").equals(userId).delete(),
      db.hospitalBagItems.where("userId").equals(userId).delete(),
      db.feedingRecords.where("userId").equals(userId).delete(),
    ]);
    sileo.success({ title: "已清除", description: "所有记录已删除" });
  }

  async function handleLogout() {
    await logout();
    sileo.success({ title: "已退出登录" });
    navigate("/auth/login", { replace: true });
  }

  return (
    <div className="max-w-lg mx-auto pb-4">
      <StickyHeader>
        <h1 className="text-2xl font-extrabold text-gray-800 dark:text-white text-center">
          设置
        </h1>
      </StickyHeader>
      <div className="px-4">
        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
          账号
        </p>
        <div className="space-y-3 mb-8">
          <div className="bg-white dark:bg-[#16213e] rounded-2xl p-5 border border-gray-200 dark:border-gray-700/60">
            <p className="text-sm font-bold text-gray-800 dark:text-white">当前账号</p>
            <p className="text-xs text-gray-400 mt-1">
              {session?.user.phone ?? "未登录"}
            </p>
            <div className="mt-4">
              <button
                onClick={handleLogout}
                className="rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>

        {/* Kick Settings Section */}
        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
          胎动设置
        </p>
        <div className="space-y-3 mb-8">
          {/* Due Date */}
          <div className="bg-white dark:bg-[#16213e] rounded-2xl p-5 border border-gray-200 dark:border-gray-700/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-white">
                  预产期
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  设置后首页显示倒计时
                </p>
              </div>
              <div className="flex items-center gap-2">
                {settings.dueDate && (
                  <button
                    onClick={() => update({ dueDate: null })}
                    className="text-xs text-gray-400 hover:text-duo-red transition-colors"
                  >
                    清除
                  </button>
                )}
                <Dialog.Root open={showCalendar} onOpenChange={setShowCalendar}>
                  <Dialog.Trigger className="bg-gray-100 dark:bg-gray-800 text-sm font-bold text-gray-800 dark:text-white rounded-xl px-3 py-2 cursor-pointer">
                    {settings.dueDate || "选择日期"}
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Backdrop className="fixed inset-0 bg-black/40 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
                    <Dialog.Popup
                      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#16213e] rounded-t-3xl px-2 pt-5 transition-all duration-300 data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full outline-none"
                      style={{
                        paddingBottom: "calc(var(--safe-area-bottom) + 2rem)",
                      }}
                    >
                      <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />
                      <Dialog.Title className="text-lg font-extrabold text-gray-800 dark:text-white text-center mb-2">
                        选择预产期
                      </Dialog.Title>
                      <div className="flex justify-center">
                        <DayPicker
                          animate
                          locale={zhCN}
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            if (date) {
                              const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                              update({ dueDate: iso });
                            } else {
                              update({ dueDate: null });
                            }
                            setShowCalendar(false);
                          }}
                          defaultMonth={selectedDate}
                          classNames={{
                            today: "border border-duo-purple font-extrabold",
                            selected:
                              "bg-duo-purple! text-white! rounded-full!",
                            chevron: `${defaultClassNames.chevron} fill-duo-purple`,
                          }}
                        />
                      </div>
                    </Dialog.Popup>
                  </Dialog.Portal>
                </Dialog.Root>
              </div>
            </div>
          </div>

          {/* Goal Count */}
          <div className="bg-white dark:bg-[#16213e] rounded-2xl p-5 border border-gray-200 dark:border-gray-700/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-white">
                  胎动目标次数
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Cardiff 标准为 10 次
                </p>
              </div>
              <NumberField.Root
                value={settings.goalCount}
                onValueChange={(val) => {
                  if (val !== null) update({ goalCount: val });
                }}
                min={1}
                max={50}
                step={1}
              >
                <NumberField.Group className="flex items-center gap-2">
                  <NumberField.Decrement className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold flex items-center justify-center active:scale-90 transition-transform cursor-pointer">
                    −
                  </NumberField.Decrement>
                  <NumberField.Input className="w-10 text-center text-xl font-extrabold text-duo-green bg-transparent border-0 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                  <NumberField.Increment className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold flex items-center justify-center active:scale-90 transition-transform cursor-pointer">
                    +
                  </NumberField.Increment>
                </NumberField.Group>
              </NumberField.Root>
            </div>
          </div>

          {/* Merge Window */}
          <div className="bg-white dark:bg-[#16213e] rounded-2xl p-5 border border-gray-200 dark:border-gray-700/60">
            <p className="text-sm font-bold text-gray-800 dark:text-white mb-1">
              合并窗口时长
            </p>
            <p className="text-xs text-gray-400 mb-3">
              窗口内的多次点击合并为 1 次有效胎动
            </p>
            <ToggleGroup
              value={[String(settings.mergeWindowMinutes)]}
              onValueChange={(val) => {
                if (val.length > 0)
                  update({ mergeWindowMinutes: Number(val[0]) });
              }}
              className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5"
            >
              {[3, 5, 10].map((minutes) => (
                <Toggle
                  key={minutes}
                  value={String(minutes)}
                  className="flex-1 py-2 rounded-[10px] text-sm font-bold text-center transition-colors cursor-pointer text-gray-500 dark:text-gray-400 data-[pressed]:bg-duo-green data-[pressed]:text-white"
                >
                  {minutes} 分钟
                </Toggle>
              ))}
            </ToggleGroup>
          </div>
        </div>

        {/* Appearance Section */}
        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
          外观
        </p>
        <div className="space-y-3 mb-8">
          <div className="bg-white dark:bg-[#16213e] rounded-2xl p-5 border border-gray-200 dark:border-gray-700/60">
            <p className="text-sm font-bold text-gray-800 dark:text-white mb-1">
              外观模式
            </p>
            <p className="text-xs text-gray-400 mb-3">
              选择浅色、深色或跟随系统
            </p>
            <ToggleGroup
              value={[settings.colorMode]}
              onValueChange={(val) => {
                if (val.length > 0) update({ colorMode: val[0] as ColorMode });
              }}
              className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5"
            >
              {(
                [
                  ["system", "系统"],
                  ["light", "浅色"],
                  ["dark", "深色"],
                ] as const
              ).map(([mode, label]) => (
                <Toggle
                  key={mode}
                  value={mode}
                  className="flex-1 py-2 rounded-[10px] text-sm font-bold text-center transition-colors cursor-pointer text-gray-500 dark:text-gray-400 data-[pressed]:bg-duo-green data-[pressed]:text-white"
                >
                  {label}
                </Toggle>
              ))}
            </ToggleGroup>
          </div>
        </div>

        {/* Data Management Section */}
        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
          数据管理
        </p>
        <div className="space-y-3 mb-8">
          <div className="bg-white dark:bg-[#16213e] rounded-2xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
            <button
              onClick={handleExport}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <span className="text-sm font-bold text-gray-800 dark:text-white">
                {exportDone ? "导出成功" : "导出数据"}
              </span>
              <span className="text-xs text-gray-400">JSON</span>
            </button>
            <div className="mx-5 border-t border-gray-100 dark:border-gray-700/40" />
            <button
              onClick={handleImport}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <span className="text-sm font-bold text-gray-800 dark:text-white">
                导入数据
              </span>
              <span className="text-xs text-gray-400">JSON</span>
            </button>
            <div className="mx-5 border-t border-gray-100 dark:border-gray-700/40" />
            <AlertDialog.Root>
              <AlertDialog.Trigger className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors cursor-pointer">
                <span className="text-sm font-bold text-duo-red">
                  清除所有数据
                </span>
              </AlertDialog.Trigger>
              <AlertDialog.Portal>
                <AlertDialog.Backdrop className="fixed inset-0 bg-black/50 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
                <AlertDialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-3rem)] max-w-sm bg-white dark:bg-[#16213e] rounded-3xl p-6 text-center transition-all duration-150 data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0">
                  <AlertDialog.Title className="text-xl font-extrabold text-gray-800 dark:text-white mb-2">
                    确认清除数据？
                  </AlertDialog.Title>
                  <AlertDialog.Description className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    此操作将删除所有胎动、宫缩、喂奶和待产包记录，且无法恢复。
                  </AlertDialog.Description>
                  <div className="flex gap-3">
                    <AlertDialog.Close className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-sm rounded-xl transition-colors cursor-pointer">
                      取消
                    </AlertDialog.Close>
                    <AlertDialog.Close
                      className="flex-1 py-3 bg-duo-red text-white font-bold text-sm rounded-xl active:scale-95 transition-all cursor-pointer"
                      onClick={handleClear}
                    >
                      确认清除
                    </AlertDialog.Close>
                  </div>
                </AlertDialog.Popup>
              </AlertDialog.Portal>
            </AlertDialog.Root>
          </div>
        </div>

        {/* Update Section */}
        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
          更新
        </p>
        <div className="space-y-3 mb-8">
          <div className="bg-white dark:bg-[#16213e] rounded-2xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
            {needRefresh ? (
              <button
                onClick={() => updateServiceWorker(true)}
                className="w-full px-5 py-4 flex items-center justify-between text-left"
              >
                <div>
                  <span className="text-sm font-bold text-duo-green">
                    发现新版本
                  </span>
                  <p className="text-xs text-gray-400 mt-0.5">点击立即更新</p>
                </div>
                <span className="text-xs font-bold text-white bg-duo-green rounded-full px-3 py-1">
                  更新
                </span>
              </button>
            ) : (
              <button
                onClick={handleCheckUpdate}
                disabled={checking}
                className="w-full px-5 py-4 flex items-center justify-between text-left disabled:opacity-50"
              >
                <span className="text-sm font-bold text-gray-800 dark:text-white">
                  {checking ? "正在检查…" : "检查更新"}
                </span>
                <span className="text-xs text-gray-400">
                  当前: {__COMMIT_HASH__}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* About Section */}
        <div className="text-center mt-4 mb-8 px-4">
          <p className="text-xs text-gray-400 dark:text-gray-500">宝宝助手</p>
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
            本应用仅为记录工具，不提供医学建议
          </p>
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-3">
            Made with care by{" "}
            <a
              href="https://cali.so"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-gray-400 dark:text-gray-500 underline decoration-gray-300 dark:decoration-gray-600 underline-offset-2"
            >
              Cali
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
