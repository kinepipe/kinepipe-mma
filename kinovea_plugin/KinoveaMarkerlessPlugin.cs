using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Kinovea.ScreenManager;
using Kinovea.Services;

namespace Kinovea.Markerless
{
    public static class MarkerlessBootstrap
    {
        private static ScreenManagerKernel _kernel;
        private static string _selectedModel = "sports2d";
        private static double _subjectHeightM = 1.72;
        private static double _butterworthCutoffHz = 6.0;
        private static Dictionary<string, object> _lastSummary;
        private static PlayerScreen _lastPlayerScreen;
        private static bool _initialized = false;

        private static readonly string[] JointOrder = new string[]
        {
            "nose",
            "neck",
            "right_shoulder",
            "left_shoulder",
            "right_elbow",
            "left_elbow",
            "right_wrist",
            "left_wrist",
            "right_hip",
            "left_hip",
            "right_knee",
            "left_knee",
            "right_ankle",
            "left_ankle"
        };

        public static void Initialize(ScreenManagerKernel kernel, ToolStrip menu)
        {
            try
            {
                _kernel = kernel;
                if (menu == null || _initialized)
                {
                    return;
                }
                _initialized = true;

                ToolStripMenuItem rootMenu = new ToolStripMenuItem("🤖 KinePipe Markerless AI");
                rootMenu.ForeColor = Color.FromArgb(0, 110, 75);
                rootMenu.Font = new Font(menu.Font, FontStyle.Bold);

                ToolStripMenuItem mnuGait = new ToolStripMenuItem("🚶‍♂️ Analizar Marcha Humana y Carrera (Gait & Running)");
                mnuGait.Click += delegate { RunProtocol("gait"); };

                ToolStripMenuItem mnuJump = new ToolStripMenuItem("⚡ Analizar Salto Vertical (CMJ / SJ / Drop Jump)");
                mnuJump.Click += delegate { RunProtocol("jump"); };

                ToolStripMenuItem mnuSquat = new ToolStripMenuItem("🏋️ Analizar Sentadilla Funcional (Squat Depth & Tempo)");
                mnuSquat.Click += delegate { RunProtocol("squat"); };

                ToolStripMenuItem mnuGeneral = new ToolStripMenuItem("✨ Auto-Track Esqueleto Completo (14 Puntos + Ángulos + CoM)");
                mnuGeneral.Click += delegate { RunProtocol("general"); };

                // Model selector submenu
                ToolStripMenuItem mnuModels = new ToolStripMenuItem("🔬 Motor de Pose IA Activo");
                ToolStripMenuItem mSports2d = new ToolStripMenuItem("Sports2D / YOLOv8-Pose (Monocular 2D Sub-Pixel)") { Checked = true, Tag = "sports2d" };
                ToolStripMenuItem mPose2Sim = new ToolStripMenuItem("Pose2Sim / OpenSim Pipeline (TRC + MOT + OSIM)") { Tag = "pose2sim" };
                ToolStripMenuItem mDLC = new ToolStripMenuItem("DeepLabCut Markerless Adapter") { Tag = "deeplabcut" };
                ToolStripMenuItem mFast = new ToolStripMenuItem("FastPose Real-Time Tracker") { Tag = "fast_pose" };

                ToolStripMenuItem[] modelItems = new ToolStripMenuItem[] { mSports2d, mPose2Sim, mDLC, mFast };
                foreach (ToolStripMenuItem item in modelItems)
                {
                    item.Click += delegate(object s, EventArgs e)
                    {
                        ToolStripMenuItem clicked = (ToolStripMenuItem)s;
                        _selectedModel = clicked.Tag.ToString();
                        foreach (ToolStripMenuItem m in modelItems) m.Checked = (m == clicked);
                    };
                    mnuModels.DropDownItems.Add(item);
                }

                ToolStripMenuItem mnuConfig = new ToolStripMenuItem("⚙️ Calibración Antropométrica (Estatura m) y Filtro Butterworth...");
                mnuConfig.Click += delegate { ShowConfigDialog(); };

                ToolStripMenuItem mnuDashboard = new ToolStripMenuItem("📊 Ver Panel de Telemetría y Reporte Clínico Multi-Gráfico");
                mnuDashboard.Click += delegate
                {
                    if (_lastSummary != null)
                    {
                        ShowResultsDialog(_lastPlayerScreen, _lastSummary);
                    }
                    else
                    {
                        MessageBox.Show("Ejecute primero un análisis de Marcha, Salto, Sentadilla o Auto-Track sobre un video cargado en Kinovea.", "KinePipe Markerless AI", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    }
                };

                ToolStripMenuItem mnuNativeLinear = new ToolStripMenuItem("📈 Abrir Cinemática Lineal de Kinovea (Trayectorias y Velocidades)");
                mnuNativeLinear.Click += delegate
                {
                    PlayerScreen ps = GetActivePlayerScreen();
                    if (ps != null && ps.Full) ps.ShowLinearKinematics();
                };

                ToolStripMenuItem mnuNativeAngular = new ToolStripMenuItem("📐 Abrir Cinemática Angular de Kinovea (Goniómetros Dinámicos)");
                mnuNativeAngular.Click += delegate
                {
                    PlayerScreen ps = GetActivePlayerScreen();
                    if (ps != null && ps.Full) ps.ShowAngularKinematics();
                };

                ToolStripMenuItem mnuOpenSim = new ToolStripMenuItem("🦴 Abrir Carpeta de Exportación OpenSim 4.x (.TRC / .MOT / .OSIM / .CSV)");
                mnuOpenSim.Click += delegate { OpenExportFolder(); };

                ToolStripMenuItem mnuStudio = new ToolStripMenuItem("🚀 Lanzar KinePipe MMA Studio Completo (Ventana Dedicada)");
                mnuStudio.Click += delegate { LaunchFullStudio(); };

                rootMenu.DropDownItems.Add(mnuGait);
                rootMenu.DropDownItems.Add(mnuJump);
                rootMenu.DropDownItems.Add(mnuSquat);
                rootMenu.DropDownItems.Add(mnuGeneral);
                rootMenu.DropDownItems.Add(new ToolStripSeparator());
                rootMenu.DropDownItems.Add(mnuModels);
                rootMenu.DropDownItems.Add(mnuConfig);
                rootMenu.DropDownItems.Add(new ToolStripSeparator());
                rootMenu.DropDownItems.Add(mnuDashboard);
                rootMenu.DropDownItems.Add(mnuNativeLinear);
                rootMenu.DropDownItems.Add(mnuNativeAngular);
                rootMenu.DropDownItems.Add(mnuOpenSim);
                rootMenu.DropDownItems.Add(new ToolStripSeparator());
                rootMenu.DropDownItems.Add(mnuStudio);

                menu.Items.Add(rootMenu);
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[Kinovea.Markerless] Initialization error: " + ex.Message);
            }
        }

        private static PlayerScreen GetActivePlayerScreen()
        {
            if (_kernel == null) return null;
            try
            {
                FieldInfo fiActive = typeof(ScreenManagerKernel).GetField("activeScreen", BindingFlags.Instance | BindingFlags.NonPublic);
                if (fiActive != null)
                {
                    object active = fiActive.GetValue(_kernel);
                    if (active is PlayerScreen) return (PlayerScreen)active;
                }

                FieldInfo fiList = typeof(ScreenManagerKernel).GetField("screenList", BindingFlags.Instance | BindingFlags.NonPublic);
                if (fiList != null)
                {
                    IList list = fiList.GetValue(_kernel) as IList;
                    if (list != null)
                    {
                        foreach (object item in list)
                        {
                            if (item is PlayerScreen) return (PlayerScreen)item;
                        }
                    }
                }
            }
            catch
            {
            }
            return null;
        }

        public static string FindEngineRoot()
        {
            string asmDir = "";
            try { asmDir = Path.GetDirectoryName(typeof(MarkerlessBootstrap).Assembly.Location); } catch { }
            string baseDir = !string.IsNullOrEmpty(asmDir) ? asmDir : AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
            string[] candidates = new string[]
            {
                Path.Combine(baseDir, "Plugins", "KinePipeMMA"),
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/'), "Plugins", "KinePipeMMA"),
                Path.Combine(baseDir, "..", "1_KinePipe_MMA_Portable"),
                Environment.GetEnvironmentVariable("KINEPIPE_ENGINE_ROOT") ?? ""
            };

            foreach (string cand in candidates)
            {
                if (!string.IsNullOrEmpty(cand))
                {
                    try
                    {
                        string full = Path.GetFullPath(cand);
                        if (File.Exists(Path.Combine(full, "runtime", "python.exe")) &&
                            File.Exists(Path.Combine(full, "backend", "cli_kinovea.py")))
                        {
                            return full;
                        }
                    }
                    catch
                    {
                    }
                }
            }
            return Path.Combine(baseDir, "Plugins", "KinePipeMMA");
        }

        private static void ShowConfigDialog()
        {
            Form dlg = new Form();
            dlg.Text = "Configuración Biomecánica • KinePipe Markerless AI";
            dlg.Size = new Size(460, 290);
            dlg.FormBorderStyle = FormBorderStyle.FixedDialog;
            dlg.MaximizeBox = false;
            dlg.MinimizeBox = false;
            dlg.StartPosition = FormStartPosition.CenterParent;
            dlg.BackColor = Color.FromArgb(20, 26, 36);
            dlg.ForeColor = Color.White;

            Label lblH = new Label() { Text = "Estatura del Sujeto Evaluado (metros):", Left = 24, Top = 26, Width = 260, ForeColor = Color.FromArgb(200, 215, 235) };
            NumericUpDown numH = new NumericUpDown() { Left = 290, Top = 22, Width = 120, DecimalPlaces = 2, Increment = 0.01M, Minimum = 0.80M, Maximum = 2.40M, Value = (decimal)_subjectHeightM };

            Label lblC = new Label() { Text = "Frecuencia Corte Filtro Butterworth 4° Orden (Hz):", Left = 24, Top = 72, Width = 260, ForeColor = Color.FromArgb(200, 215, 235) };
            NumericUpDown numC = new NumericUpDown() { Left = 290, Top = 68, Width = 120, DecimalPlaces = 1, Increment = 0.5M, Minimum = 1.0M, Maximum = 20.0M, Value = (decimal)_butterworthCutoffHz };

            Label lblM = new Label() { Text = "Motor de Estimación de Pose Sin Marcadores:", Left = 24, Top = 118, Width = 260, ForeColor = Color.FromArgb(200, 215, 235) };
            ComboBox cmbM = new ComboBox() { Left = 24, Top = 144, Width = 386, DropDownStyle = ComboBoxStyle.DropDownList };
            cmbM.Items.AddRange(new object[] { "sports2d", "pose2sim", "deeplabcut", "fast_pose" });
            cmbM.SelectedItem = _selectedModel;

            Button btnOk = new Button() { Text = "Guardar Configuración", Left = 230, Top = 198, Width = 180, Height = 34, BackColor = Color.FromArgb(0, 200, 120), ForeColor = Color.Black, FlatStyle = FlatStyle.Flat };
            btnOk.Click += delegate
            {
                _subjectHeightM = (double)numH.Value;
                _butterworthCutoffHz = (double)numC.Value;
                if (cmbM.SelectedItem != null) _selectedModel = cmbM.SelectedItem.ToString();
                dlg.DialogResult = DialogResult.OK;
                dlg.Close();
            };

            dlg.Controls.AddRange(new Control[] { lblH, numH, lblC, numC, lblM, cmbM, btnOk });
            dlg.ShowDialog();
        }

        private static void RunProtocol(string protocol)
        {
            PlayerScreen playerScreen = GetActivePlayerScreen();
            if (playerScreen == null || !playerScreen.Full || string.IsNullOrEmpty(playerScreen.FilePath))
            {
                MessageBox.Show(
                    "Por favor abra primero un video en el reproductor de Kinovea antes de ejecutar el análisis biomecánico sin marcadores.",
                    "KinePipe Markerless AI",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
                return;
            }

            string engineRoot = FindEngineRoot();
            string pythonExe = Path.Combine(engineRoot, "runtime", "python.exe");
            string cliScript = Path.Combine(engineRoot, "backend", "cli_kinovea.py");

            if (!File.Exists(pythonExe) || !File.Exists(cliScript))
            {
                MessageBox.Show(
                    "No se encontró el motor portable de KinePipe MMA en:\n" + engineRoot,
                    "Error de Motor Portable",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            playerScreen.StopPlaying();
            string videoPath = playerScreen.FilePath;
            string outDir = Path.Combine(Path.GetDirectoryName(videoPath), "KinePipe_Analysis");
            Directory.CreateDirectory(outDir);

            // Progress dialog
            Form progressForm = new Form();
            progressForm.Text = "KinePipe Markerless AI • Procesando Video en Kinovea 2025.2";
            progressForm.Size = new Size(540, 190);
            progressForm.FormBorderStyle = FormBorderStyle.FixedDialog;
            progressForm.StartPosition = FormStartPosition.CenterScreen;
            progressForm.ControlBox = false;
            progressForm.BackColor = Color.FromArgb(16, 22, 32);
            progressForm.ForeColor = Color.White;

            Label lblTitle = new Label()
            {
                Text = string.Format("Ejecutando protocolo '{0}' con motor '{1}'...", protocol.ToUpperInvariant(), _selectedModel.ToUpperInvariant()),
                Left = 24,
                Top = 22,
                Width = 480,
                Font = new Font("Segoe UI", 10f, FontStyle.Bold),
                ForeColor = Color.FromArgb(0, 255, 136)
            };

            Label lblStatus = new Label()
            {
                Text = "Inicializando motor neuronal portable (100% offline)...",
                Left = 24,
                Top = 54,
                Width = 480,
                ForeColor = Color.FromArgb(200, 215, 235)
            };

            ProgressBar bar = new ProgressBar()
            {
                Left = 24,
                Top = 88,
                Width = 480,
                Height = 26,
                Minimum = 0,
                Maximum = 100,
                Value = 5
            };

            progressForm.Controls.AddRange(new Control[] { lblTitle, lblStatus, bar });

            string resultJsonPath = null;
            string errorOutput = "";

            System.ComponentModel.BackgroundWorker worker = new System.ComponentModel.BackgroundWorker();
            worker.WorkerReportsProgress = true;
            worker.DoWork += delegate
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = pythonExe;
                psi.Arguments = string.Format(
                    CultureInfo.InvariantCulture,
                    "\"{0}\" --video \"{1}\" --model {2} --protocol {3} --height {4:F2} --cutoff {5:F1} --out-dir \"{6}\"",
                    cliScript, videoPath, _selectedModel, protocol, _subjectHeightM, _butterworthCutoffHz, outDir
                );
                psi.WorkingDirectory = engineRoot;
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                psi.RedirectStandardOutput = true;
                psi.RedirectStandardError = true;
                psi.StandardOutputEncoding = Encoding.UTF8;
                psi.StandardErrorEncoding = Encoding.UTF8;

                using (Process proc = Process.Start(psi))
                {
                    while (!proc.StandardOutput.EndOfStream)
                    {
                        string line = proc.StandardOutput.ReadLine();
                        if (string.IsNullOrEmpty(line)) continue;
                        if (line.StartsWith("PROGRESS:"))
                        {
                            string[] parts = line.Split(new char[] { ':' }, 3);
                            int pct = 10;
                            if (parts.Length >= 2) int.TryParse(parts[1], out pct);
                            string msg = parts.Length >= 3 ? parts[2] : "Procesando...";
                            worker.ReportProgress(Math.Min(100, Math.Max(0, pct)), msg);
                        }
                        else if (line.StartsWith("RESULT_JSON:"))
                        {
                            resultJsonPath = line.Substring("RESULT_JSON:".Length).Trim();
                        }
                    }
                    errorOutput = proc.StandardError.ReadToEnd();
                    proc.WaitForExit();
                }
            };

            worker.ProgressChanged += delegate(object s, System.ComponentModel.ProgressChangedEventArgs e)
            {
                bar.Value = e.ProgressPercentage;
                if (e.UserState != null) lblStatus.Text = e.UserState.ToString();
            };

            worker.RunWorkerCompleted += delegate
            {
                progressForm.Close();
            };

            progressForm.Shown += delegate { worker.RunWorkerAsync(); };
            progressForm.ShowDialog();

            if (string.IsNullOrEmpty(resultJsonPath) || !File.Exists(resultJsonPath))
            {
                MessageBox.Show(
                    "No se pudo completar el análisis biomecánico:\n" + errorOutput,
                    "Error en KinePipe Markerless AI",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            try
            {
                string jsonText = File.ReadAllText(resultJsonPath, Encoding.UTF8);
                JavaScriptSerializer serializer = new JavaScriptSerializer();
                serializer.MaxJsonLength = int.MaxValue;
                Dictionary<string, object> summary = serializer.Deserialize<Dictionary<string, object>>(jsonText);
                _lastSummary = summary;
                _lastPlayerScreen = playerScreen;

                InjectIntoPlayerScreen(playerScreen, summary);
                ShowResultsDialog(playerScreen, summary);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Error al inyectar las trayectorias en el lienzo de Kinovea:\n" + ex.Message,
                    "KinePipe Markerless AI",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private static string ToRtf(string plainText)
        {
            if (string.IsNullOrEmpty(plainText)) return "";
            if (plainText.StartsWith("{\\rtf")) return plainText;
            try
            {
                using (RichTextBox rtb = new RichTextBox())
                {
                    rtb.Text = plainText;
                    return rtb.Rtf;
                }
            }
            catch
            {
                return "";
            }
        }

        private static void CleanPreviousKinePipeData(Metadata metadata)
        {
            try
            {
                // Remove previous KinePipe.* tracks
                List<DrawingTrack> existingTracks = metadata.Tracks();
                if (existingTracks != null)
                {
                    foreach (DrawingTrack trk in existingTracks.ToList())
                    {
                        if (trk.Name != null && trk.Name.StartsWith("KinePipe."))
                        {
                            metadata.TrackabilityManager.ForgetTrack(trk.Id);
                            metadata.DeleteDrawing(metadata.TrackManager.Id, trk.Id);
                        }
                    }
                }

                // Remove previous KinePipe_Skeleton drawings from keyframes
                if (metadata.Keyframes != null)
                {
                    foreach (Keyframe kf in metadata.Keyframes.ToList())
                    {
                        if (kf.Drawings != null)
                        {
                            foreach (AbstractDrawing drw in kf.Drawings.ToList())
                            {
                                if (drw.Name == "KinePipe_Skeleton")
                                {
                                    if (drw is ITrackable)
                                    {
                                        metadata.TrackabilityManager.Remove((ITrackable)drw);
                                    }
                                    metadata.DeleteDrawing(kf.Id, drw.Id);
                                }
                            }
                        }
                    }
                }
            }
            catch
            {
            }
        }

        private static void InjectIntoPlayerScreen(PlayerScreen playerScreen, Dictionary<string, object> summary)
        {
            Metadata metadata = playerScreen.FrameServer.Metadata;
            if (metadata == null) return;

            ArrayList framesList = summary.ContainsKey("frames") ? (summary["frames"] as ArrayList) : null;
            if (framesList == null || framesList.Count == 0) return;

            CleanPreviousKinePipeData(metadata);
            metadata.BeforeKVAImport();

            // 1. Select KinePipeModel or fallback to BodyWithFeet / HumanModel
            string toolName = "KinePipeModel";
            if (!ToolManager.Tools.ContainsKey(toolName))
            {
                toolName = ToolManager.Tools.ContainsKey("BodyWithFeet") ? "BodyWithFeet" : "HumanModel";
            }

            DrawingToolGenericPosture postureTool = ToolManager.Tools.ContainsKey(toolName)
                ? (ToolManager.Tools[toolName] as DrawingToolGenericPosture)
                : null;

            double avgTsPerFrame = metadata.AverageTimeStampsPerFrame > 0 ? metadata.AverageTimeStampsPerFrame : 33.3333;
            long firstTs = metadata.FirstTimeStamp;

            DrawingGenericPosture drawingPosture = null;
            List<List<TimedPoint>> jointTrajectories = new List<List<TimedPoint>>();
            for (int i = 0; i < JointOrder.Length; i++)
            {
                jointTrajectories.Add(new List<TimedPoint>());
            }

            for (int idx = 0; idx < framesList.Count; idx++)
            {
                Dictionary<string, object> fObj = framesList[idx] as Dictionary<string, object>;
                if (fObj == null) continue;

                int frameIndex = Convert.ToInt32(fObj["f"]);
                long timestamp = (long)Math.Round(firstTs + frameIndex * avgTsPerFrame);
                Dictionary<string, object> kps = fObj.ContainsKey("kps") ? (fObj["kps"] as Dictionary<string, object>) : null;
                if (kps == null) continue;

                if (idx == 0 && postureTool != null)
                {
                    GenericPosture gp = GenericPostureManager.Instanciate(postureTool.ToolId, true);
                    for (int j = 0; j < JointOrder.Length; j++)
                    {
                        string jName = JointOrder[j];
                        if (kps.ContainsKey(jName))
                        {
                            ArrayList coords = kps[jName] as ArrayList;
                            if (coords != null && coords.Count >= 2)
                            {
                                float px = Convert.ToSingle(coords[0], CultureInfo.InvariantCulture);
                                float py = Convert.ToSingle(coords[1], CultureInfo.InvariantCulture);
                                gp.AssignValue(jName, new PointF(px, py));
                            }
                        }
                    }

                    drawingPosture = new DrawingGenericPosture(
                        postureTool.ToolId,
                        PointF.Empty,
                        gp,
                        timestamp,
                        avgTsPerFrame,
                        ToolManager.GetDefaultStyleElements(toolName)
                    );
                    drawingPosture.Name = "KinePipe_Skeleton";

                    List<AbstractDrawing> initDrawings = new List<AbstractDrawing>() { drawingPosture };
                    Keyframe initKf = new Keyframe(
                        Guid.NewGuid(),
                        timestamp,
                        "Esqueleto IA (" + _selectedModel.ToUpperInvariant() + ")",
                        Color.FromArgb(0, 229, 255),
                        ToRtf("Modelo biomecánico de 14 articulaciones + CoM (de Leva 1996) + Goniómetros dinámicos."),
                        initDrawings,
                        metadata
                    );
                    metadata.MergeInsertKeyframe(initKf);
                }

                for (int j = 0; j < JointOrder.Length; j++)
                {
                    string jName = JointOrder[j];
                    if (kps.ContainsKey(jName))
                    {
                        ArrayList coords = kps[jName] as ArrayList;
                        if (coords != null && coords.Count >= 2)
                        {
                            float px = Convert.ToSingle(coords[0], CultureInfo.InvariantCulture);
                            float py = Convert.ToSingle(coords[1], CultureInfo.InvariantCulture);
                            jointTrajectories[j].Add(new TimedPoint(px, py, timestamp));
                        }
                    }
                }
            }

            // 2. Create DrawingTrack trajectories and bind DrawingTracker so the skeleton animates across every frame!
            if (drawingPosture != null)
            {
                Dictionary<string, DrawingTrack> trackDict = new Dictionary<string, DrawingTrack>();
                for (int j = 0; j < JointOrder.Length; j++)
                {
                    if (jointTrajectories[j].Count == 0) continue;
                    string jName = JointOrder[j];
                    Color trackColor = jName.StartsWith("right_")
                        ? Color.FromArgb(0, 229, 255)
                        : (jName.StartsWith("left_") ? Color.FromArgb(255, 145, 0) : Color.FromArgb(0, 255, 136));

                    StyleElements style = new StyleElements();
                    style.Elements.Add("color", new StyleElementColor(trackColor));
                    style.Elements.Add("track shape", new StyleElementTrackShape(TrackShape.Solid));
                    style.Elements.Add("line size", new StyleElementLineSize(2));
                    style.Elements.Add("TrackPointSize", new StyleElementPenSize(3));
                    style.Elements.Add("label size", new StyleElementFontSize(8, "Label size"));

                    DrawingTrack dTrack = new DrawingTrack(
                        "KinePipe." + jName,
                        jointTrajectories[j],
                        avgTsPerFrame,
                        style
                    );
                    trackDict.Add(j.ToString(), dTrack);
                    metadata.AddDrawing(metadata.TrackManager.Id, dTrack);
                }

                DrawingTracker tracker = new DrawingTracker(drawingPosture, trackDict);
                metadata.TrackabilityManager.ImportTracker(tracker, trackDict.Values.ToList());
            }

            // 3. Inject clinical Keyframes (Heel Strike, Toe-Off, Dip, Takeoff, Apex, Landing, Squat Max Depth)
            ArrayList kfsList = summary.ContainsKey("keyframes") ? (summary["keyframes"] as ArrayList) : null;
            if (kfsList != null)
            {
                foreach (object kfItem in kfsList)
                {
                    Dictionary<string, object> kfObj = kfItem as Dictionary<string, object>;
                    if (kfObj == null) continue;
                    int fIdx = Convert.ToInt32(kfObj["frame_index"]);
                    long ts = (long)Math.Round(firstTs + fIdx * avgTsPerFrame);
                    string title = kfObj.ContainsKey("title") ? kfObj["title"].ToString() : ("Evento #" + fIdx);
                    string notes = kfObj.ContainsKey("notes") ? kfObj["notes"].ToString() : "";
                    string evType = kfObj.ContainsKey("event_type") ? kfObj["event_type"].ToString() : "";

                    StringBuilder commentBuilder = new StringBuilder();
                    if (!string.IsNullOrEmpty(notes)) commentBuilder.AppendLine(notes);

                    if (kfObj.ContainsKey("angles") && kfObj["angles"] is Dictionary<string, object>)
                    {
                        Dictionary<string, object> angs = (Dictionary<string, object>)kfObj["angles"];
                        List<string> angParts = new List<string>();
                        foreach (KeyValuePair<string, object> kv in angs)
                        {
                            angParts.Add(string.Format(CultureInfo.InvariantCulture, "{0}: {1:F1}°", kv.Key, Convert.ToDouble(kv.Value)));
                        }
                        if (angParts.Count > 0)
                        {
                            commentBuilder.AppendLine("Ángulos articulares: " + string.Join(" | ", angParts.ToArray()));
                        }
                    }

                    Color kfColor = Color.FromArgb(56, 189, 248);
                    if (evType.Contains("heel") || evType.Contains("takeoff")) kfColor = Color.FromArgb(0, 255, 136);
                    else if (evType.Contains("toe") || evType.Contains("apex")) kfColor = Color.FromArgb(255, 145, 0);
                    else if (evType.Contains("landing") || evType.Contains("squat") || evType.Contains("dip")) kfColor = Color.FromArgb(244, 63, 94);

                    Keyframe clinicalKf = new Keyframe(
                        Guid.NewGuid(),
                        ts,
                        title,
                        kfColor,
                        ToRtf(commentBuilder.ToString().Trim()),
                        new List<AbstractDrawing>(),
                        metadata
                    );
                    metadata.MergeInsertKeyframe(clinicalKf);
                }
            }

            metadata.AfterKVAImport();
            playerScreen.view.RefreshImage();
        }

        private static void ShowResultsDialog(PlayerScreen playerScreen, Dictionary<string, object> summary)
        {
            Form resForm = new Form();
            resForm.Text = "KinePipe Markerless AI • Telemetría Biomecánica y Navegador de Eventos";
            resForm.Size = new Size(760, 560);
            resForm.StartPosition = FormStartPosition.CenterScreen;
            resForm.BackColor = Color.FromArgb(15, 20, 30);
            resForm.ForeColor = Color.White;

            string modelUsed = summary.ContainsKey("model_used") ? summary["model_used"].ToString().ToUpperInvariant() : "SPORTS2D";
            string protocol = summary.ContainsKey("protocol") ? summary["protocol"].ToString().ToUpperInvariant() : "GENERAL";
            double fps = summary.ContainsKey("fps") ? Convert.ToDouble(summary["fps"]) : 30.0;

            Label lblHeader = new Label()
            {
                Text = string.Format("Resultados Biomecánicos • Motor: {0} • Protocolo: {1} ({2:F1} FPS)", modelUsed, protocol, fps),
                Left = 20,
                Top = 16,
                Width = 700,
                Height = 26,
                Font = new Font("Segoe UI", 11f, FontStyle.Bold),
                ForeColor = Color.FromArgb(0, 255, 136)
            };

            TextBox txtMetrics = new TextBox()
            {
                Left = 20,
                Top = 48,
                Width = 700,
                Height = 165,
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.Vertical,
                BackColor = Color.FromArgb(24, 32, 48),
                ForeColor = Color.FromArgb(230, 240, 255),
                Font = new Font("Consolas", 9.5f),
                BorderStyle = BorderStyle.FixedSingle
            };

            StringBuilder sb = new StringBuilder();
            if (summary.ContainsKey("gait_analysis") && summary["gait_analysis"] is Dictionary<string, object>)
            {
                Dictionary<string, object> g = (Dictionary<string, object>)summary["gait_analysis"];
                sb.AppendLine("=== ANÁLISIS DE MARCHA HUMANA Y CARRERA (GAIT & RUNNING) ===");
                sb.AppendFormat("• Cadencia: {0} pasos/min   |   Tiempo de Zancada: {1} s\r\n", g["cadence_spm"], g["avg_stride_time_s"]);
                sb.AppendFormat("• Fases del Ciclo: Apoyo {0}% / Oscilación {1}%\r\n", g["stance_phase_percent"], g["swing_phase_percent"]);
                sb.AppendFormat("• Flexión Rodilla (Contacto Inicial): {0}°   |   Máx Flexión en Oscilación: {1}°\r\n", g["knee_flexion_at_contact"], g["max_knee_flexion_swing"]);
                sb.AppendFormat("• Extensión Máx Cadera: {0}°   |   Inclinación Anterior Tronco: {1}°\r\n\r\n", g["max_hip_extension"], g["trunk_forward_lean_deg"]);
            }
            if (summary.ContainsKey("jump_analysis") && summary["jump_analysis"] is Dictionary<string, object>)
            {
                Dictionary<string, object> j = (Dictionary<string, object>)summary["jump_analysis"];
                sb.AppendLine("=== ANÁLISIS DE SALTO VERTICAL (CMJ / SJ / DROP JUMP) ===");
                sb.AppendFormat("• Altura de Vuelo (g·t²/8): {0} cm   |   Tiempo de Vuelo: {1} s\r\n", j["flight_height_cm"], j["flight_time_s"]);
                sb.AppendFormat("• Velocidad de Despegue: {0} m/s   |   Altura por Impulso (v²/2g): {1} cm\r\n", j["takeoff_velocity_m_s"], j["takeoff_height_cm"]);
                sb.AppendFormat("• Profundidad Contramovimiento (Dip): {0} cm   |   Máx Flexión Rodilla: {1}°\r\n", j["countermovement_depth_cm"], j["max_knee_flexion_deg"]);
                sb.AppendFormat("• Fotogramas Clave: Dip #{0} -> Despegue #{1} -> Vértice #{2} -> Aterrizaje #{3}\r\n\r\n", j["lowest_frame"], j["takeoff_frame"], j["apex_frame"], j["landing_frame"]);
            }
            if (summary.ContainsKey("squat_analysis") && summary["squat_analysis"] is Dictionary<string, object>)
            {
                Dictionary<string, object> sq = (Dictionary<string, object>)summary["squat_analysis"];
                sb.AppendLine("=== ANÁLISIS DE SENTADILLA FUNCIONAL (SQUAT) ===");
                sb.AppendFormat("• Clasificación de Profundidad: {0} (Frame #{1})\r\n", sq["squat_depth_category"], sq["max_depth_frame"]);
                sb.AppendFormat("• Ángulo Mínimo Rodilla: {0}°   |   Ángulo Mínimo Cadera: {1}°\r\n", sq["min_knee_angle_deg"], sq["min_hip_angle_deg"]);
                sb.AppendFormat("• Inclinación Máxima Tronco: {0}°   |   Tempo Excéntrico/Concéntrico: {1}s / {2}s\r\n", sq["max_trunk_lean_deg"], sq["eccentric_duration_s"], sq["concentric_duration_s"]);
            }
            txtMetrics.Text = sb.ToString();

            Label lblGrid = new Label()
            {
                Text = "Eventos Biomecánicos Detectados (Haga clic en una fila para saltar al instante exacto en Kinovea):",
                Left = 20,
                Top = 224,
                Width = 700,
                ForeColor = Color.FromArgb(56, 189, 248),
                Font = new Font("Segoe UI", 9.5f, FontStyle.Bold)
            };

            DataGridView grid = new DataGridView()
            {
                Left = 20,
                Top = 248,
                Width = 700,
                Height = 195,
                ReadOnly = true,
                AllowUserToAddRows = false,
                AllowUserToDeleteRows = false,
                SelectionMode = DataGridViewSelectionMode.FullRowSelect,
                MultiSelect = false,
                BackgroundColor = Color.FromArgb(24, 32, 48),
                ForeColor = Color.Black,
                AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
                RowHeadersVisible = false
            };
            grid.Columns.Add("Frame", "Frame");
            grid.Columns.Add("TimeS", "Tiempo (s)");
            grid.Columns.Add("Event", "Evento Biomecánico");
            grid.Columns.Add("Notes", "Observación Clínica / Ángulos");
            grid.Columns[0].FillWeight = 14;
            grid.Columns[1].FillWeight = 16;
            grid.Columns[2].FillWeight = 28;
            grid.Columns[3].FillWeight = 42;

            ArrayList kfsList = summary.ContainsKey("keyframes") ? (summary["keyframes"] as ArrayList) : null;
            if (kfsList != null)
            {
                foreach (object item in kfsList)
                {
                    Dictionary<string, object> kf = item as Dictionary<string, object>;
                    if (kf == null) continue;
                    grid.Rows.Add(
                        kf["frame_index"],
                        string.Format(CultureInfo.InvariantCulture, "{0:F3} s", Convert.ToDouble(kf["time_s"])),
                        kf["title"],
                        kf["notes"]
                    );
                }
            }

            grid.CellClick += delegate(object s, DataGridViewCellEventArgs e)
            {
                if (e.RowIndex >= 0 && playerScreen != null && playerScreen.Full && playerScreen.FrameServer.Metadata != null)
                {
                    int fIdx = Convert.ToInt32(grid.Rows[e.RowIndex].Cells[0].Value);
                    Metadata md = playerScreen.FrameServer.Metadata;
                    long targetTs = (long)Math.Round(md.FirstTimeStamp + fIdx * md.AverageTimeStampsPerFrame);
                    playerScreen.view.ForcePosition(targetTs, true);
                    playerScreen.view.RefreshImage();
                }
            };

            Button btnReport = new Button()
            {
                Text = "📊 Abrir Reporte Multi-Gráfico HTML",
                Left = 20,
                Top = 458,
                Width = 220,
                Height = 38,
                BackColor = Color.FromArgb(0, 220, 130),
                ForeColor = Color.Black,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 9f, FontStyle.Bold)
            };
            btnReport.Click += delegate
            {
                if (summary.ContainsKey("report_path") && File.Exists(summary["report_path"].ToString()))
                {
                    Process.Start(new ProcessStartInfo(summary["report_path"].ToString()) { UseShellExecute = true });
                }
            };

            Button btnLinear = new Button()
            {
                Text = "📈 Cinemática Lineal (Kinovea)",
                Left = 250,
                Top = 458,
                Width = 155,
                Height = 38,
                BackColor = Color.FromArgb(30, 58, 138),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat
            };
            btnLinear.Click += delegate
            {
                if (playerScreen != null && playerScreen.Full) playerScreen.ShowLinearKinematics();
            };

            Button btnAngular = new Button()
            {
                Text = "📐 Cinemática Angular (Kinovea)",
                Left = 415,
                Top = 458,
                Width = 155,
                Height = 38,
                BackColor = Color.FromArgb(30, 58, 138),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat
            };
            btnAngular.Click += delegate
            {
                if (playerScreen != null && playerScreen.Full) playerScreen.ShowAngularKinematics();
            };

            Button btnFolder = new Button()
            {
                Text = "🦴 Archivos OpenSim",
                Left = 580,
                Top = 458,
                Width = 140,
                Height = 38,
                BackColor = Color.FromArgb(51, 65, 85),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat
            };
            btnFolder.Click += delegate { OpenExportFolder(); };

            resForm.Controls.AddRange(new Control[] { lblHeader, txtMetrics, lblGrid, grid, btnReport, btnLinear, btnAngular, btnFolder });
            resForm.Show();
        }

        private static void OpenExportFolder()
        {
            if (_lastSummary != null && _lastSummary.ContainsKey("trc_path"))
            {
                string dir = Path.GetDirectoryName(_lastSummary["trc_path"].ToString());
                if (Directory.Exists(dir))
                {
                    Process.Start("explorer.exe", "\"" + dir + "\"");
                    return;
                }
            }
            PlayerScreen ps = GetActivePlayerScreen();
            if (ps != null && !string.IsNullOrEmpty(ps.FilePath))
            {
                string dir = Path.GetDirectoryName(ps.FilePath);
                if (Directory.Exists(dir))
                {
                    Process.Start("explorer.exe", "\"" + dir + "\"");
                    return;
                }
            }
        }

        private static void LaunchFullStudio()
        {
            string engineRoot = FindEngineRoot();
            string exePath = Path.Combine(engineRoot, "KinePipe-MMA.exe");
            if (File.Exists(exePath))
            {
                Process.Start(new ProcessStartInfo(exePath) { WorkingDirectory = engineRoot, UseShellExecute = true });
            }
            else
            {
                string pyw = Path.Combine(engineRoot, "runtime", "pythonw.exe");
                string appPy = Path.Combine(engineRoot, "desktop_app.py");
                if (File.Exists(pyw) && File.Exists(appPy))
                {
                    Process.Start(new ProcessStartInfo(pyw, "\"" + appPy + "\"") { WorkingDirectory = engineRoot, UseShellExecute = false });
                }
            }
        }
    }
}
