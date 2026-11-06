using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace KinePipe.Launcher
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            try
            {
                string rootDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
                string pythonw = Path.Combine(rootDir, "runtime", "pythonw.exe");
                string python = Path.Combine(rootDir, "runtime", "python.exe");
                string script = Path.Combine(rootDir, "desktop_app.py");

                string exeToUse = File.Exists(pythonw) ? pythonw : python;
                if (!File.Exists(exeToUse))
                {
                    MessageBox.Show(
                        "No se encontró el entorno Python portable en:\n" + exeToUse,
                        "KinePipe MMA Portable",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    return;
                }

                string extraArgs = "";
                string currentExeName = Path.GetFileNameWithoutExtension(Application.ExecutablePath).ToLowerInvariant();
                if (currentExeName.Contains("browser") || (args != null && args.Length > 0 && args[0] == "--browser"))
                {
                    extraArgs = " --browser";
                }

                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = exeToUse;
                psi.Arguments = "\"" + script + "\"" + extraArgs;
                psi.WorkingDirectory = rootDir;
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;

                string appData = Path.Combine(rootDir, "AppData");
                string tempDir = Path.Combine(appData, "Temp");
                Directory.CreateDirectory(tempDir);

                psi.EnvironmentVariables["TEMP"] = tempDir;
                psi.EnvironmentVariables["TMP"] = tempDir;
                psi.EnvironmentVariables["PYTHONDONTWRITEBYTECODE"] = "1";
                psi.EnvironmentVariables["YOLO_OFFLINE"] = "true";

                Process.Start(psi);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Error al iniciar KinePipe MMA Portable:\n" + ex.Message,
                    "KinePipe MMA Portable",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }
    }
}

