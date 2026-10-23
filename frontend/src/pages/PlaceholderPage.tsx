type Props = {
  title: string;
  description: string;
};

function PlaceholderPage({
  title,
  description,
}: Props) {
  return (
    <>
      <div className="page-header">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>

      <div className="empty-card">
        <h2>{title}</h2>
        <p>Trang này sẽ được xây dựng ở bước tiếp theo.</p>
      </div>
    </>
  );
}

export default PlaceholderPage;