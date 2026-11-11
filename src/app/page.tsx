import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import OldPainting from "@/components/OldPainting";

export default function Home() {
  return (
    <section className="book-page max-w-2xl mx-auto px-8 sm:px-14 py-14 text-center">
      <p className="text-xs tracking-[0.4em] text-sepia mb-4">第 一 章</p>
      <h1 className="font-title text-4xl sm:text-5xl font-extrabold text-ink leading-tight">
        고구마마켓
      </h1>
      <p className="mt-3 text-ink-soft italic">우리 동네 이웃과 나누는 따끈한 중고거래</p>

      <div className="ornament my-8">❦</div>

      {/* 옛 그림: 김홍도 〈씨름〉 — 장터에 모인 사람들의 북적임 */}
      <OldPainting
        name="ssireum"
        className="w-44 sm:w-52 float-none sm:float-right mx-auto sm:ml-6 mb-6 rotate-1"
        sizes="208px"
      />

      <p className="drop-cap text-left leading-loose text-ink">
        옛날 옛적, 장날이면 이웃들이 저마다 쓰던 물건을 들고 나와 서로 바꾸고
        나누었습니다. 고구마마켓은 그 정겨운 장터를 한 권의 책에 담았습니다.
        안 쓰는 물건은 이웃에게, 필요한 물건은 가까이에서 — 군고구마처럼 따뜻한
        거래를 시작해 보세요.
      </p>

      <div className="ornament my-8 clear-both">✦</div>

      {/* 로그인 여부에 따라 달라지는 부분만 요청 시점에 그린다 */}
      <Suspense fallback={<p className="text-ink-soft italic">책장을 펼치는 중…</p>}>
        <CallToAction />
      </Suspense>
    </section>
  );
}

async function CallToAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return (
      <div className="space-y-4">
        <p className="text-ink">어서 오세요, 장터 문이 열렸습니다.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/posts" className="stamp-btn px-8 py-3">
            장터 구경하기
          </Link>
          <Link href="/posts/new" className="ghost-btn px-8 py-3">
            판매글 쓰기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <Link href="/posts" className="ghost-btn px-8 py-3">
        장터 구경하기
      </Link>
      <Link href="/signup" className="stamp-btn px-8 py-3">
        장터 명부에 이름 올리기
      </Link>
      <Link href="/login" className="ghost-btn px-8 py-3">
        로그인
      </Link>
    </div>
  );
}
