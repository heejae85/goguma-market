import Link from "next/link";

// 없는(탈퇴했거나 지워진) 이웃의 프로필에 들어왔을 때
// 같은 폴더의 page.tsx에서 notFound()를 부르면 루트 not-found 대신 이 화면이 나온다
export default function UserNotFound() {
  return (
    <section className="book-page max-w-md mx-auto px-8 sm:px-12 py-14 text-center">
      <p className="text-xs tracking-[0.4em] text-sepia">著 者 未 詳</p>
      <h1 className="font-title text-3xl font-extrabold mt-2">장터를 떠난 이웃</h1>
      <div className="ornament my-6">❦</div>
      <p className="leading-loose text-ink">
        이 이웃은 장터 명부에서 이름을 내렸거나
        <br />
        처음부터 없던 이름이에요.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
        <Link href="/chats" className="stamp-btn px-6 py-2.5">
          편지함으로
        </Link>
        <Link href="/posts" className="ghost-btn px-6 py-2.5">
          장터 구경하기
        </Link>
      </div>
    </section>
  );
}
