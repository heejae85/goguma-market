import Link from "next/link";

// 없는 주소·없는 글에 들어왔을 때 보여주는 페이지 (notFound()를 부르면 여기로 온다)
// 기본 영어 화면("This page could not be found") 대신 옛 책 말투로 안내한다
export default function NotFound() {
  return (
    <section className="book-page max-w-md mx-auto px-8 sm:px-12 py-14 text-center">
      <p className="text-xs tracking-[0.4em] text-sepia">落 張</p>
      <h1 className="font-title text-3xl font-extrabold mt-2">찢겨 나간 책장</h1>
      <div className="ornament my-6">❦</div>
      <p className="leading-loose text-ink">
        찾으시는 쪽이 이 책에 없습니다.
        <br />
        이미 내려간 물건이거나, 주소가 잘못되었을 수 있어요.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
        <Link href="/posts" className="stamp-btn px-6 py-2.5">
          장터 구경하기
        </Link>
        <Link href="/" className="ghost-btn px-6 py-2.5">
          첫 장으로
        </Link>
      </div>
    </section>
  );
}
