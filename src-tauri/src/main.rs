#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
  fs,
  io::{BufRead, BufReader, Write},
  path::PathBuf,
  process::{Command, Stdio},
  thread::sleep,
  time::Duration,
};
use tauri::{generate_context};
use tauri_plugin_fs::init as fs_init;

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

#[derive(Serialize, Deserialize)]
struct JSONRPCRequest {
  jsonrpc: String,
  id: u64,
  method: String,
  params: Value,
}

#[derive(Serialize, Deserialize)]
struct JSONRPCResponse {
  jsonrpc: String,
  id: u64,
  result: Option<Value>,
  error: Option<Value>,
}

#[derive(Serialize)]
struct RPCResult {
  result: Value,
}

#[cfg(unix)]
fn apply_executable_flag(path: &PathBuf) -> Result<(), String> {
  let mut perms = fs::metadata(path)
    .map_err(|e| format!("metadata error: {}", e))?
    .permissions();
  perms.set_mode(0o755);
  fs::set_permissions(path, perms)
    .map_err(|e| format!("chmod error: {}", e))
}

#[cfg(not(unix))]
fn apply_executable_flag(_path: &PathBuf) -> Result<(), String> {
  Ok(())
}

fn spawn_process(path: &PathBuf) -> Result<std::process::Child, String> {
  Command::new(path)
    .stdin(Stdio::piped())
    .stdout(Stdio::piped())
    .stderr(Stdio::inherit())
    .spawn()
    .map_err(|e| format!("Failed to start `{}`: {}", path.display(), e))
}

fn send_request(
  stdin: &mut std::process::ChildStdin,
  req: &JSONRPCRequest,
) -> Result<(), String> {
  let mut data = serde_json::to_vec(req).map_err(|e| e.to_string())?;
  data.push(b'\n');
  stdin
    .write_all(&data)
    .map_err(|e| format!("Error writing stdin: {}", e))
}

fn read_response(
  reader: &mut BufReader<std::process::ChildStdout>,
) -> Result<JSONRPCResponse, String> {
  let mut line = String::new();
  reader
    .read_line(&mut line)
    .map_err(|e| format!("Error reading stdout: {}", e))?;
  serde_json::from_str(&line)
    .map_err(|e| format!("Error parsing JSON '{}': {}", line.trim_end(), e))
}

#[tauri::command]
fn list_tools(path: String) -> Result<RPCResult, String> {
  let exe_path = PathBuf::from(&path);
  if !exe_path.exists() {
    return Err(format!("Executable not found: {}", exe_path.display()));
  }
  apply_executable_flag(&exe_path)?;
  let mut child = spawn_process(&exe_path)?;
  let mut stdin = child
    .stdin
    .take()
    .ok_or("Failed to open stdin")?;
  let stdout = child
    .stdout
    .take()
    .ok_or("Failed to open stdout")?;
  let mut reader = BufReader::new(stdout);

  let req = JSONRPCRequest {
    jsonrpc: "2.0".into(),
    id: 1,
    method: "tools/list".into(),
    params: serde_json::json!({}),
  };
  send_request(&mut stdin, &req)?;
  let res = read_response(&mut reader)?;
  let tools = res
    .result
    .ok_or("tools/list response missing result")?
    .get("tools")
    .cloned()
    .ok_or("tools key not found in result")?;

  let _ = child.kill();
  Ok(RPCResult { result: tools })
}

#[tauri::command]
fn call_tool(path: String, tool: String, args: Value) -> Result<RPCResult, String> {
  let exe_path = PathBuf::from(&path);
  if !exe_path.exists() {
    return Err(format!("Executable not found: {}", exe_path.display()));
  }
  apply_executable_flag(&exe_path)?;
  let mut child = spawn_process(&exe_path)?;
  let mut stdin = child
    .stdin
    .take()
    .ok_or("Failed to open stdin")?;
  let stdout = child
    .stdout
    .take()
    .ok_or("Failed to open stdout")?;
  let mut reader = BufReader::new(stdout);

  let list_req = JSONRPCRequest {
    jsonrpc: "2.0".into(),
    id: 1,
    method: "tools/list".into(),
    params: serde_json::json!({}),
  };
  send_request(&mut stdin, &list_req)?;
  let _ = read_response(&mut reader)?;
  sleep(Duration::from_millis(100));

  let call_req = JSONRPCRequest {
    jsonrpc: "2.0".into(),
    id: 2,
    method: "tools/call".into(),
    params: serde_json::json!({ "name": tool, "arguments": args }),
  };
  send_request(&mut stdin, &call_req)?;
  let res = read_response(&mut reader)?;
  let content = res
    .result
    .ok_or("tools/call response missing result")?
    .get("content")
    .cloned()
    .unwrap_or(Value::Null);

  let _ = child.kill();
  Ok(RPCResult { result: content })
}

fn main() {
  tauri::Builder::default()
    .plugin(fs_init())
    .invoke_handler(tauri::generate_handler![list_tools, call_tool])
    .run(generate_context!())
    .expect("error while running tauri application");
}
