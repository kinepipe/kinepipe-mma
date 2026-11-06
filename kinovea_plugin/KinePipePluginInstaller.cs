using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Windows.Forms;

namespace KinePipe.PluginInstaller
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm());
        }
    }

    public class InstallerForm : Form
    {
        private TextBox txtKinoveaPath;
        private TextBox txtLog;
        private Button btnInstall;
        private Button btnUninstall;

        public InstallerForm()
        {
            this.Text = "Instalador Offline • Complemento KinePipe Markerless AI para Kinovea 2025.2.0";
            this.Size = new Size(660, 420);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(15, 20, 30);
            this.ForeColor = Color.White;

            Label lblTitle = new Label()
            {
                Text = "Complemento Directo KinePipe Markerless AI v1.5.2 (100% Portable / Sin Admin)",
                Left = 20,
                Top = 18,
                Width = 600,
                Height = 26,
                Font = new Font("Segoe UI", 11f, FontStyle.Bold),
                ForeColor = Color.FromArgb(0, 255, 136)
            };

            Label lblSub = new Label()
            {
                Text = "Seleccione la carpeta donde se encuentra su versión portable de Kinovea 2025.2.0 (Kinovea.exe):",
                Left = 20,
                Top = 50,
                Width = 600,
                ForeColor = Color.FromArgb(200, 215, 235)
            };

            txtKinoveaPath = new TextBox()
            {
                Left = 20,
                Top = 76,
                Width = 490,
                BackColor = Color.FromArgb(24, 32, 48),
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 9.5f)
            };

            string defaultKinovea = DetectKinoveaFolder();
            txtKinoveaPath.Text = defaultKinovea;

            Button btnBrowse = new Button()
            {
                Text = "Examinar...",
                Left = 520,
                Top = 74,
                Width = 100,
                Height = 28,
                BackColor = Color.FromArgb(51, 65, 85),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat
            };
            btnBrowse.Click += delegate
            {
                using (FolderBrowserDialog fbd = new FolderBrowserDialog())
                {
                    fbd.Description = "Seleccione la carpeta de Kinovea 2025.2.0 (que contiene Kinovea.exe)";
                    if (Directory.Exists(txtKinoveaPath.Text)) fbd.SelectedPath = txtKinoveaPath.Text;
                    if (fbd.ShowDialog() == DialogResult.OK)
                    {
                        txtKinoveaPath.Text = fbd.SelectedPath;
                    }
                }
            };

            btnInstall = new Button()
            {
                Text = "⚡ Instalar Complemento en Kinovea",
                Left = 20,
                Top = 118,
                Width = 340,
                Height = 40,
                BackColor = Color.FromArgb(0, 215, 125),
                ForeColor = Color.Black,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 10f, FontStyle.Bold)
            };
            btnInstall.Click += delegate { RunInstallation(false); };

            btnUninstall = new Button()
            {
                Text = "🔄 Desinstalar y Restaurar Original (.bak)",
                Left = 375,
                Top = 118,
                Width = 245,
                Height = 40,
                BackColor = Color.FromArgb(180, 45, 65),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 9f, FontStyle.Bold)
            };
            btnUninstall.Click += delegate { RunInstallation(true); };

            txtLog = new TextBox()
            {
                Left = 20,
                Top = 174,
                Width = 600,
                Height = 185,
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.Vertical,
                BackColor = Color.FromArgb(10, 14, 22),
                ForeColor = Color.FromArgb(160, 230, 190),
                Font = new Font("Consolas", 9f)
            };
            txtLog.Text = "[LISTO] Instalador offline sin permisos de administrador.\r\n" +
                          "Incluye: Sports2D (YOLOv8-Pose), Pose2Sim (OpenSim TRC/MOT/OSIM), DeepLabCut, FastPose,\r\n" +
                          "Módulos clínicos de Marcha Humana, Carrera, Salto Vertical (CMJ/SJ/DJ) y Sentadilla.\r\n";

            this.Controls.AddRange(new Control[] { lblTitle, lblSub, txtKinoveaPath, btnBrowse, btnInstall, btnUninstall, txtLog });
        }

        private string DetectKinoveaFolder()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
            if (File.Exists(Path.Combine(baseDir, "Kinovea.exe"))) return baseDir;
            string parentKin = Path.GetFullPath(Path.Combine(baseDir, "..", "..", "Kinovea-2025.2.0"));
            if (File.Exists(Path.Combine(parentKin, "Kinovea.exe"))) return parentKin;
            return baseDir;
        }

        private void AppendLog(string msg)
        {
            txtLog.AppendText(msg + "\r\n");
        }

        private void RunInstallation(bool uninstall)
        {
            string targetDir = txtKinoveaPath.Text.Trim();
            if (string.IsNullOrEmpty(targetDir) || !File.Exists(Path.Combine(targetDir, "Kinovea.ScreenManager.dll")))
            {
                MessageBox.Show("La carpeta seleccionada no contiene 'Kinovea.ScreenManager.dll'. Seleccione una carpeta válida de Kinovea 2025.2.0.", "Carpeta Inválida", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            string pluginRoot = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
            string patcherExe = Path.Combine(pluginRoot, "KinePipePatcher.exe");

            try
            {
                if (uninstall)
                {
                    AppendLog("Restaurando Kinovea original...");
                    Process p = Process.Start(new ProcessStartInfo(patcherExe, "\"" + targetDir + "\" --uninstall")
                    {
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true
                    });
                    string stdout = p.StandardOutput.ReadToEnd();
                    p.WaitForExit();
                    AppendLog(stdout.Trim());
                    MessageBox.Show("Complemento KinePipe desinstalado y archivos originales restaurados.", "Desinstalación Exitosa", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    return;
                }

                AppendLog("[1/4] Copiando ensamblado Kinovea.Markerless.dll...");
                File.Copy(Path.Combine(pluginRoot, "Kinovea.Markerless.dll"), Path.Combine(targetDir, "Kinovea.Markerless.dll"), true);

                AppendLog("[2/4] Instalando herramienta biomecánica 13 - KinePipe Biomechanical Model.xml...");
                string srcTool = Path.Combine(pluginRoot, "DrawingTools", "Custom", "13 - KinePipe Biomechanical Model.xml");
                string dstToolDir = Path.Combine(targetDir, "DrawingTools", "Custom");
                Directory.CreateDirectory(dstToolDir);
                if (File.Exists(srcTool))
                {
                    File.Copy(srcTool, Path.Combine(dstToolDir, "13 - KinePipe Biomechanical Model.xml"), true);
                }

                string srcToolbar = Path.Combine(pluginRoot, "DrawingTools", "Toolbars", "player.xml");
                string dstToolbar = Path.Combine(targetDir, "DrawingTools", "Toolbars", "player.xml");
                if (File.Exists(srcToolbar) && File.Exists(dstToolbar))
                {
                    if (!File.Exists(dstToolbar + ".bak")) File.Copy(dstToolbar, dstToolbar + ".bak", false);
                    File.Copy(srcToolbar, dstToolbar, true);
                }

                AppendLog("[3/4] Vinculando motor portable KinePipeMMA...");
                string srcEngine = Path.Combine(pluginRoot, "Plugins", "KinePipeMMA");
                string dstEngine = Path.Combine(targetDir, "Plugins", "KinePipeMMA");
                if (Directory.Exists(srcEngine) && !string.Equals(Path.GetFullPath(srcEngine), Path.GetFullPath(dstEngine), StringComparison.OrdinalIgnoreCase))
                {
                    Process robo = Process.Start(new ProcessStartInfo("robocopy.exe", "\"" + srcEngine + "\" \"" + dstEngine + "\" /E /MT:16 /NFL /NDL /NJH /NJS")
                    {
                        UseShellExecute = false,
                        CreateNoWindow = true
                    });
                    robo.WaitForExit();
                }

                AppendLog("[4/4] Aplicando hook IL en Kinovea.ScreenManager.dll (con respaldo .bak)...");
                Process patchProc = Process.Start(new ProcessStartInfo(patcherExe, "\"" + targetDir + "\"")
                {
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                });
                string pOut = patchProc.StandardOutput.ReadToEnd();
                string pErr = patchProc.StandardError.ReadToEnd();
                patchProc.WaitForExit();
                if (!string.IsNullOrEmpty(pOut)) AppendLog(pOut.Trim());
                if (!string.IsNullOrEmpty(pErr)) AppendLog(pErr.Trim());

                AppendLog("¡Instalación completada! Abra Kinovea.exe y verá el menú '🤖 KinePipe Markerless AI'.");
                MessageBox.Show("Complemento KinePipe Markerless AI instalado exitosamente en:\n" + targetDir, "Instalación Exitosa", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                AppendLog("[ERROR] " + ex.Message);
                MessageBox.Show("Error durante la operación:\n" + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}

