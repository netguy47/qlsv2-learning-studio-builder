def share_text_for_export(title: str, export_kind: str, link_or_path: str):
    return (
        f"{title}\n\n"
        f"Type: {export_kind}\n"
        f"{link_or_path}\n\n"
        f"Created with QLSV2 Learning Studio"
    )
