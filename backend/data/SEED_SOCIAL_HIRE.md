# Social-hire JD 种子数据

将 16 条字节/腾讯社交向岗位 JD 写入本地 SQLite（`resume_agent.db`），并绑定胜任力模型 `product_social_hire`。

## 运行

```bash
cd backend
pip install -r requirements.txt   # 首次
python seed_social_hire_jobs.py
```

幂等规则：若已存在相同 `job_url`，或相同 `title` + `company`，则跳过。

预览（不写库）：

```bash
python seed_social_hire_jobs.py --dry-run
```

数据文件：`data/seed_jobs_social_hire.json`。胜任力维度见 `data/competency_models.json` 中的 `product_social_hire`。
