package com.foodie.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.foodie.common.exception.BadRequestException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.infrastructure.storage.ImageMagicBytes;
import org.junit.jupiter.api.Test;

class ImageMagicBytesTest {

    @Test
    void detectsPng() {
        byte[] header = new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47, 0, 0, 0, 0, 0, 0, 0, 0};
        var detected = ImageMagicBytes.detect(header, "image/png");
        assertThat(detected.contentType()).isEqualTo("image/png");
        assertThat(detected.extension()).isEqualTo("png");
    }

    @Test
    void mismatchDeclaredType_throws() {
        byte[] header = new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47, 0, 0, 0, 0, 0, 0, 0, 0};
        assertThatThrownBy(() -> ImageMagicBytes.detect(header, "image/jpeg"))
                .isInstanceOf(BadRequestException.class)
                .extracting(ex -> ((BadRequestException) ex).getErrorCode())
                .isEqualTo(ErrorCode.FILE_CONTENT_MISMATCH);
    }

    @Test
    void invalidType_throws() {
        byte[] header = new byte[16];
        assertThatThrownBy(() -> ImageMagicBytes.detect(header, "image/png"))
                .isInstanceOf(BadRequestException.class)
                .extracting(ex -> ((BadRequestException) ex).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_FILE_TYPE);
    }
}
