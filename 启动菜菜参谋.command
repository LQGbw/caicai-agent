#!/bin/zsh

set -u

cd -- "${0:A:h}"

echo "正在启动菜菜参谋……"
echo "这个窗口保持打开时，菜菜参谋会一直运行。"
echo "需要停止时，按 Control+C 或关闭这个窗口。"
echo

if [[ ! -d node_modules ]]; then
  echo "首次启动，正在安装依赖……"
  npm install || exit 1
fi

npm run dev -- --hostname 127.0.0.1 --port 3210 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null' EXIT INT TERM

for attempt in {1..40}; do
  if curl --silent --fail http://127.0.0.1:3210 >/dev/null 2>&1; then
    open "http://127.0.0.1:3210"
    wait "$server_pid"
    exit $?
  fi
  sleep 0.25
done

echo "启动超时，请把这个窗口里的报错发给我。"
kill "$server_pid" 2>/dev/null
exit 1
